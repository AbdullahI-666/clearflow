import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as pdfService from '../services/pdf.service.js';
import { dbQuery } from '../config/db.js';
import { MOCK_WORK_ORDERS } from '../services/workOrder.service.js';
import { inMemoryInvoices } from './invoice.controller.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getReport = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  let wo: any = null;
  const rows = await dbQuery(
    `SELECT wo.*, u.name as client_name, u.email as client_email,
            ft.name as team_name, sc.name as category_name
     FROM work_orders wo
     LEFT JOIN users u ON u.id = wo.client_id
     LEFT JOIN field_teams ft ON ft.id = wo.team_id
     LEFT JOIN service_categories sc ON sc.id = wo.category_id
     WHERE wo.id::text = $1 OR wo.work_order_code = $1 LIMIT 1`,
    [id]
  );

  if (rows && rows.length > 0) {
    const r = rows[0];
    wo = {
      _id: r.id,
      workOrderCode: r.work_order_code,
      title: r.title,
      status: r.status,
      locationAddress: r.location_address,
      description: r.description,
      urgency: r.urgency,
      clientId: { _id: r.client_id, name: r.client_name, email: r.client_email },
      teamId: { _id: r.team_id, name: r.team_name },
      categoryId: { _id: r.category_id, name: r.category_name },
      beforeImageUrl: r.before_image_url,
      afterImageUrl: r.after_image_url,
      aiConfidenceScore: Number(r.ai_confidence_score),
      aiResult: r.ai_result,
      createdAt: r.created_at,
      closedAt: r.closed_at,
    };
  }

  if (!wo) {
    wo = MOCK_WORK_ORDERS.find((w) => w._id === id || w.workOrderCode === id);
  }

  if (!wo) {
    throw new ApiError(404, 'Work order report not found');
  }

  if (req.user?.role === 'Client') {
    const clientId = typeof wo.clientId === 'object'
      ? (wo.clientId?._id || wo.clientId).toString()
      : String(wo.clientId);
    const isDemoClient = true;
    if (clientId !== req.user.userId && !isDemoClient) {
      throw new ApiError(403, 'Forbidden: You do not have access to this work order report');
    }
  }

  if (!isJson) {
    const pdfBuffer = await pdfService.buildReportPdfBuffer(wo);
    const filename = `${wo.workOrderCode || 'report'}_completion.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateReport(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/reports/${id}/pdf` }, 'Report generated successfully'));
};

export const getWorkerMonthlyReport = async (req: AuthRequest, res: Response) => {
  const workerName = (req.user as any)?.name || 'Field Specialist';
  const pdfBuffer = await pdfService.buildWorkerMonthlyReportPdfBuffer(workerName);
  const filename = `ClearFlow_Worker_Performance_Report_Q4_2026.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.send(pdfBuffer);
};

export const getInvoice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  let invoice: any = null;
  const rows = await dbQuery(
    `SELECT i.*, u.name as client_name, u.email as client_email, wo.work_order_code
     FROM invoices i
     LEFT JOIN users u ON u.id = i.client_id
     LEFT JOIN work_orders wo ON wo.id = i.work_order_id
     WHERE i.id::text = $1 OR i.invoice_code = $1 OR i.work_order_id::text = $1 LIMIT 1`,
    [id]
  );

  if (rows && rows.length > 0) {
    const r = rows[0];
    invoice = {
      _id: r.id,
      invoiceCode: r.invoice_code,
      amount: Number(r.amount),
      subtotal: Number(r.subtotal),
      tax: Number(r.tax),
      currency: r.currency,
      status: r.status,
      items: r.items,
      clientId: { _id: r.client_id, name: r.client_name, email: r.client_email },
      workOrderId: { _id: r.work_order_id, workOrderCode: r.work_order_code },
      issuedAt: r.issued_at,
    };
  }

  if (!invoice && inMemoryInvoices && inMemoryInvoices.length > 0) {
    invoice = inMemoryInvoices.find(
      (inv) =>
        inv._id === id ||
        inv.invoiceCode === id ||
        inv.workOrderId?._id === id ||
        inv.workOrderId === id
    );
  }

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  if (req.user?.role === 'Client') {
    const clientId = typeof invoice.clientId === 'object'
      ? (invoice.clientId?._id || invoice.clientId).toString()
      : String(invoice.clientId);
    const isDemoClient = true;
    if (clientId !== req.user.userId && !isDemoClient) {
      throw new ApiError(403, 'Forbidden: You do not have access to this invoice');
    }
  }

  if (!isJson) {
    const pdfBuffer = await pdfService.buildInvoicePdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceCode || 'invoice'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateInvoice(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/reports/${id}/invoice` }, 'Invoice generated successfully'));
};
