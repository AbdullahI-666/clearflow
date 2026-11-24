import React from 'react';
import { 
  Check, Clock, Navigation, MapPin, Wrench, 
  Sparkles, CheckCircle2, Banknote, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';

export type TrackingStage =
  | 'RequestCreated'
  | 'OffersReceived'
  | 'MemberSelected'
  | 'Assigned'
  | 'OnTheWay'
  | 'Arrived'
  | 'WorkStarted'
  | 'InProgress'
  | 'Work25'
  | 'Work50'
  | 'Work75'
  | 'Work100'
  | 'Completed'
  | 'PaymentSettled';

interface JobTrackingTimelineProps {
  currentStage?: string;
  onUpdateStage?: (stage: TrackingStage) => void;
  isFieldTeam?: boolean;
  className?: string;
}

const STAGES: { id: TrackingStage; label: string; icon: any; stepNumber: number }[] = [
  { id: 'RequestCreated', label: 'Request Created', icon: Clock, stepNumber: 1 },
  { id: 'OffersReceived', label: 'Offers Received', icon: Sparkles, stepNumber: 2 },
  { id: 'MemberSelected', label: 'Member Selected', icon: Check, stepNumber: 3 },
  { id: 'Assigned', label: 'Assigned', icon: CheckCircle2, stepNumber: 4 },
  { id: 'OnTheWay', label: 'On The Way', icon: Navigation, stepNumber: 5 },
  { id: 'Arrived', label: 'Arrived', icon: MapPin, stepNumber: 6 },
  { id: 'WorkStarted', label: 'In Progress', icon: Wrench, stepNumber: 7 },
  { id: 'Completed', label: 'Completed', icon: Sparkles, stepNumber: 8 },
  { id: 'PaymentSettled', label: 'Payment Settled', icon: Banknote, stepNumber: 9 },
];

export const JobTrackingTimeline: React.FC<JobTrackingTimelineProps> = ({
  currentStage = 'RequestCreated',
  onUpdateStage,
  isFieldTeam = false,
  className,
}) => {
  const theme = useRoleTheme();
  const isAdmin = theme.role === 'admin';
  const isField = theme.role === 'fieldteam' || isFieldTeam;

  const currentIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.id.toLowerCase() === currentStage.toLowerCase())
  );

  const activeColor = isAdmin
    ? 'bg-purple-600 text-white border-purple-600'
    : isField
    ? 'bg-amber-600 text-white border-amber-600'
    : 'bg-teal-600 text-white border-teal-600';

  const completedColor = isAdmin
    ? 'bg-purple-100 text-purple-700 border-purple-300'
    : isField
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-teal-100 text-teal-800 border-teal-300';

  const barActiveColor = isAdmin
    ? 'bg-purple-600'
    : isField
    ? 'bg-amber-500'
    : 'bg-teal-600';

  return (
    <div className={cn('w-full space-y-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs', className)}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Service Lifecycle</span>
          <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full animate-ping', barActiveColor)} />
            Stage {currentIndex + 1} of {STAGES.length}: {STAGES[currentIndex]?.label || currentStage}
          </h4>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-800 shadow-2xs">
            {STAGES[currentIndex]?.label || 'Active'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500 rounded-full', barActiveColor)}
          style={{ width: `${((currentIndex + 1) / STAGES.length) * 100}%` }}
        />
      </div>

      {/* Scrollable Stage Pills */}
      <div className="overflow-x-auto pb-1 pt-1 no-scrollbar flex items-center gap-1.5 text-xs">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                disabled={!isFieldTeam || !onUpdateStage}
                onClick={() => onUpdateStage && onUpdateStage(stage.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition-all text-left',
                  isCurrent
                    ? activeColor + ' shadow-xs ring-2 ring-offset-1 ' + (isAdmin ? 'ring-purple-400' : isField ? 'ring-amber-400' : 'ring-teal-400')
                    : isDone
                    ? completedColor
                    : 'bg-gray-50 text-gray-400 border-gray-200 opacity-60',
                  isFieldTeam && onUpdateStage ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                )}
                title={stage.label}
              >
                {isDone ? (
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <Icon className="w-3 h-3 shrink-0" />
                )}
                <span>{stage.label}</span>
              </button>
              {idx < STAGES.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
