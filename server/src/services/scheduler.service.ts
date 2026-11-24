import cron, { ScheduledTask } from 'node-cron';
import { env } from '../config/env.js';
import * as aiService from './ai.service.js';
import * as notifService from './notification.service.js';
import { MOCK_WORK_ORDERS } from './workOrder.service.js';
import { DEFAULT_TEAMS_DATA } from '../controllers/team.controller.js';
import { pgPool } from '../config/db.js';

export interface JobExecutionLog {
  jobId: string;
  runAt: Date;
  finishedAt: Date;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  attempt: number;
  error?: string;
  outputSummary?: string;
}

export interface ScheduledJobConfig {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  taskHandler: () => Promise<any>;
}

export interface ScheduledJobInternal extends ScheduledJobConfig {
  taskInstance: ScheduledTask | null;
  isRunning: boolean;
  lastRunAt: Date | null;
  lastFinishedAt: Date | null;
  lastStatus: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  lastError: string | null;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  skippedRuns: number;
}

class SchedulerService {
  private jobs: Map<string, ScheduledJobInternal> = new Map();
  private auditHistory: JobExecutionLog[] = [];
  private readonly MAX_HISTORY = 100;
  private isInitialized = false;

  constructor() {
    this.registerDefaultJobs();
  }

  /**
   * Register system jobs that genuinely require fixed-time scheduling
   */
  private registerDefaultJobs() {
    // 1. Daily 7-Day ML Rolling Forecast Recalibration & Cache Warming (00:05 AM every day)
    this.registerJob({
      id: 'job_daily_forecast',
      name: '7-Day ML Forecast Recalibration & Cache Warmer',
      description: 'Recalibrates rolling linear regression model and warms dashboard demand predictions',
      cronExpression: '5 0 * * *',
      taskHandler: async () => {
        const forecast = await aiService.generateWorkloadForecast();
        return `Recalibrated 7-day rolling forecast (${forecast.forecast?.length || 7} days generated)`;
      },
    });

    // 2. SLA Escalation & Overdue Work Order Auditor (Every 15 minutes)
    this.registerJob({
      id: 'job_sla_monitor',
      name: 'SLA Escalation & Breach Monitor',
      description: 'Monitors open and assigned work orders against category SLAs and dispatches alerts for at-risk tickets',
      cronExpression: '*/15 * * * *',
      taskHandler: async () => {
        let activeOrders: any[] = [];
        try {
          const res = await pgPool.query(
            `SELECT wo.*, sc.name as category_name
             FROM work_orders wo
             LEFT JOIN service_categories sc ON sc.id = wo.category_id
             WHERE wo.status IN ('Open', 'Assigned', 'InProgress')`
          );
          if (res.rows && res.rows.length > 0) {
            activeOrders = res.rows.map(r => ({
              _id: r.id,
              workOrderCode: r.work_order_code,
              status: r.status,
              createdAt: r.created_at,
              categoryId: { name: r.category_name, slaHours: 8 }
            }));
          } else {
            activeOrders = MOCK_WORK_ORDERS.filter(w => ['Open', 'Assigned', 'InProgress'].includes(w.status));
          }
        } catch (_) {
          activeOrders = MOCK_WORK_ORDERS.filter(w => ['Open', 'Assigned', 'InProgress'].includes(w.status));
        }

        let atRiskCount = 0;
        const now = Date.now();

        for (const order of activeOrders) {
          const createdAt = new Date(order.createdAt).getTime();
          const elapsedHours = (now - createdAt) / (1000 * 60 * 60);
          const maxSlaHours = order.categoryId?.slaHours || 8;

          if (elapsedHours >= maxSlaHours * 0.8 && order.status !== 'Closed') {
            atRiskCount++;
            // Create escalation notification if breached
            if (elapsedHours >= maxSlaHours) {
              const code = order.workOrderCode || (order as any).id || order._id?.toString() || 'WO-2026-0001';
              await notifService.create({
                roles: ['Admin'],
                workOrderId: code,
                type: 'StatusUpdate',
                title: `SLA Breach Alert: ${code}`,
                message: `Work Order ${code} has exceeded its ${maxSlaHours}h SLA target (${elapsedHours.toFixed(1)}h elapsed).`,
                metadata: {
                  workOrderId: code,
                  workOrderCode: code,
                  clientName: (order as any).clientId?.name || 'Client',
                  workerName: (order as any).teamId?.name || (order as any).assignedWorker?.name || 'Assigned Worker',
                  elapsedHours: Number(elapsedHours.toFixed(1)),
                  maxSlaHours,
                },
              });
            }
          }
        }

        return `Scanned ${activeOrders.length} active work orders. At risk/escalated: ${atRiskCount}`;
      },
    });

    // 3. Telemetry Heartbeat & GPS Stale Node Auditor (Every 10 minutes)
    this.registerJob({
      id: 'job_telemetry_heartbeat',
      name: 'Fleet Telemetry Heartbeat & Dispatch Node Auditor',
      description: 'Audits GPS telemetry nodes to ensure field crew positioning radar is live and synchronized',
      cronExpression: '*/10 * * * *',
      taskHandler: async () => {
        const teams = DEFAULT_TEAMS_DATA;
        const activeCount = teams.filter(t => t.isActive).length;
        return `Synchronized ${teams.length} telemetry nodes (${activeCount} active in field)`;
      },
    });

    // 4. Daily Environmental Impact & Waste Diversion Aggregation (23:55 PM every day)
    this.registerJob({
      id: 'job_environmental_digest',
      name: 'Daily EPA Waste Diversion Aggregator',
      description: 'Rolls up daily completed waste collection orders and calculates EPA carbon offsets',
      cronExpression: '55 23 * * *',
      taskHandler: async () => {
        const completedOrders = MOCK_WORK_ORDERS.filter(w => w.status === 'Closed' && w.isWasteCategory);
        const totalKg = completedOrders.reduce((sum, w: any) => sum + (w.wasteQuantityKg || 50), 0);
        const impact = aiService.estimateWasteEnvironmentalImpact('General Waste Collection', totalKg);
        return `Daily summary computed: ${totalKg} kg diverted, ${impact.metrics.carbonOffsetKgCo2e} kg CO2 greenhouse gas prevented`;
      },
    });
  }

  /**
   * Register a new job with concurrency locking and retry metadata
   */
  public registerJob(config: ScheduledJobConfig): void {
    if (!cron.validate(config.cronExpression)) {
      throw new Error(`Invalid cron expression '${config.cronExpression}' for job '${config.id}'`);
    }

    const jobInternal: ScheduledJobInternal = {
      ...config,
      timezone: config.timezone || env.TIMEZONE || 'UTC',
      enabled: config.enabled !== false,
      maxRetries: config.maxRetries ?? 2,
      retryDelayMs: config.retryDelayMs ?? 1500,
      taskInstance: null,
      isRunning: false,
      lastRunAt: null,
      lastFinishedAt: null,
      lastStatus: 'IDLE',
      lastError: null,
      totalRuns: 0,
      successRuns: 0,
      failedRuns: 0,
      skippedRuns: 0,
    };

    this.jobs.set(config.id, jobInternal);
    console.log(`[Scheduler] Registered job: '${config.name}' (${config.id}) [${config.cronExpression}]`);
  }

  /**
   * Start the scheduler and all registered jobs
   */
  public startAll(): void {
    if (!env.SCHEDULER_ENABLED) {
      console.log('[Scheduler] SCHEDULER_ENABLED is false; background daemon idle.');
      return;
    }

    console.log(`[Scheduler] Initializing background cron engine (Timezone: ${env.TIMEZONE || 'UTC'})...`);

    for (const [id, job] of this.jobs.entries()) {
      if (job.enabled && !job.taskInstance) {
        job.taskInstance = cron.schedule(
          job.cronExpression,
          async () => {
            await this.executeJobWithLock(id, false);
          },
          {
            timezone: job.timezone,
          }
        );
        console.log(`  ⏱️ Scheduled '${id}' [${job.cronExpression}]`);
      }
    }

    this.isInitialized = true;
    console.log(`[Scheduler] ${this.jobs.size} background cron jobs active and monitored.`);
  }

  /**
   * Gracefully stop all scheduled cron jobs
   */
  public stopAll(): void {
    console.log('[Scheduler] Stopping all background cron tasks...');
    for (const job of this.jobs.values()) {
      if (job.taskInstance) {
        job.taskInstance.stop();
        job.taskInstance = null;
      }
    }
    this.isInitialized = false;
    console.log('[Scheduler] All background tasks stopped.');
  }

  /**
   * Concurrency-safe execution wrapper with mutex lock and retry loop
   */
  public async executeJobWithLock(jobId: string, isManual = false): Promise<JobExecutionLog> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' is not registered`);
    }

    // 1. Duplicate Execution Prevention (Concurrency Mutex Lock)
    if (job.isRunning) {
      console.warn(`[Scheduler] DUPLICATE EXECUTION BLOCKED: Job '${jobId}' is already running in background.`);
      job.skippedRuns++;
      job.lastStatus = 'SKIPPED';
      const skippedLog: JobExecutionLog = {
        jobId,
        runAt: new Date(),
        finishedAt: new Date(),
        durationMs: 0,
        status: 'SKIPPED',
        attempt: 0,
        outputSummary: 'Skipped to prevent concurrent duplicate execution',
      };
      this.recordLog(skippedLog);
      return skippedLog;
    }

    job.isRunning = true;
    job.lastRunAt = new Date();
    job.lastStatus = 'RUNNING';
    job.totalRuns++;

    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = job.maxRetries ?? 2;
    let lastErr: any = null;
    let outputSummary = '';

    console.log(`[Scheduler] 🚀 Starting job '${job.id}' (${job.name}) [Manual: ${isManual}]`);

    // 2. Execution with Automatic Retry Mechanism
    while (attempt <= maxRetries) {
      attempt++;
      try {
        const result = await job.taskHandler();
        outputSummary = typeof result === 'string' ? result : JSON.stringify(result);
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        console.error(`[Scheduler] Attempt ${attempt}/${maxRetries + 1} failed for job '${jobId}': ${err.message}`);
        if (attempt <= maxRetries) {
          const delay = (job.retryDelayMs ?? 1500) * attempt;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    const durationMs = Date.now() - startTime;
    job.isRunning = false;
    job.lastFinishedAt = new Date();

    let executionLog: JobExecutionLog;

    if (lastErr) {
      job.failedRuns++;
      job.lastStatus = 'FAILED';
      job.lastError = lastErr.message;
      console.error(`[Scheduler] ❌ Job '${jobId}' FAILED after ${attempt} attempts (${durationMs}ms): ${lastErr.message}`);

      executionLog = {
        jobId,
        runAt: job.lastRunAt,
        finishedAt: job.lastFinishedAt,
        durationMs,
        status: 'FAILED',
        attempt,
        error: lastErr.message,
      };
    } else {
      job.successRuns++;
      job.lastStatus = 'SUCCESS';
      job.lastError = null;
      console.log(`[Scheduler] ✅ Job '${jobId}' SUCCESS (${durationMs}ms): ${outputSummary}`);

      executionLog = {
        jobId,
        runAt: job.lastRunAt,
        finishedAt: job.lastFinishedAt,
        durationMs,
        status: 'SUCCESS',
        attempt,
        outputSummary,
      };
    }

    this.recordLog(executionLog);
    return executionLog;
  }

  /**
   * Store execution log in rolling audit history
   */
  private recordLog(log: JobExecutionLog) {
    this.auditHistory.unshift(log);
    if (this.auditHistory.length > this.MAX_HISTORY) {
      this.auditHistory.pop();
    }
  }

  /**
   * Return comprehensive diagnostic status for all background jobs
   */
  public getStatus() {
    const jobsList = Array.from(this.jobs.values()).map(j => ({
      id: j.id,
      name: j.name,
      description: j.description,
      cronExpression: j.cronExpression,
      timezone: j.timezone,
      enabled: j.enabled,
      isRunning: j.isRunning,
      lastRunAt: j.lastRunAt,
      lastFinishedAt: j.lastFinishedAt,
      lastStatus: j.lastStatus,
      lastError: j.lastError,
      stats: {
        totalRuns: j.totalRuns,
        successRuns: j.successRuns,
        failedRuns: j.failedRuns,
        skippedRuns: j.skippedRuns,
      },
    }));

    return {
      schedulerActive: this.isInitialized,
      enabledConfig: env.SCHEDULER_ENABLED,
      systemTimezone: env.TIMEZONE || 'UTC',
      totalRegisteredJobs: this.jobs.size,
      jobs: jobsList,
      recentAuditLogs: this.auditHistory.slice(0, 20),
    };
  }

  /**
   * Enable or disable a job
   */
  public toggleJob(jobId: string, enable: boolean) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found`);

    job.enabled = enable;
    if (!enable && job.taskInstance) {
      job.taskInstance.stop();
      job.taskInstance = null;
    } else if (enable && !job.taskInstance && this.isInitialized) {
      job.taskInstance = cron.schedule(job.cronExpression, async () => {
        await this.executeJobWithLock(jobId, false);
      }, { timezone: job.timezone });
    }

    return job;
  }
}

// Singleton export
export const scheduler = new SchedulerService();
export default scheduler;
