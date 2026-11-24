import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Check } from 'lucide-react';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const theme = useRoleTheme();
  let pillStyles = 'bg-gray-50 text-gray-700 border-gray-200/90';
  let Icon = CheckCircle2;

  const normalized = (status || '').toLowerCase().replace(/[\s_-]+/g, '');

  switch (normalized) {
    case 'open':
    case 'unassigned':
      pillStyles = 'bg-sky-50 text-sky-700 border-sky-200/90';
      Icon = AlertCircle;
      break;
    case 'assigned':
      pillStyles = 'bg-blue-50 text-blue-700 border-blue-200/90';
      Icon = Clock;
      break;
    case 'inprogress':
    case 'onjob':
      pillStyles =
        theme.role === 'admin'
          ? 'bg-purple-50 text-purple-700 border-purple-200/90'
          : theme.role === 'fieldteam'
          ? 'bg-amber-50 text-amber-700 border-amber-200/90'
          : 'bg-teal-50 text-teal-700 border-teal-200/90';
      Icon = Clock;
      break;
    case 'pendingreview':
      pillStyles = 'bg-purple-50 text-purple-700 border-purple-200/90';
      Icon = Clock;
      break;
    case 'pendingclientconfirmation':
      pillStyles = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      Icon = Clock;
      break;
    case 'revisionrequired':
      pillStyles = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      Icon = AlertCircle;
      break;
    case 'disputed':
      pillStyles = 'bg-red-100 text-red-900 border-red-300 font-bold';
      Icon = AlertCircle;
      break;
    case 'completed':
    case 'available':
    case 'closed':
      pillStyles = 'bg-emerald-50 text-emerald-700 border border-emerald-200/90';
      Icon = Check;
      break;
    case 'cancelled':
    case 'refused':
    case 'flagged':
      pillStyles = 'bg-red-50 text-red-700 border-red-200/90';
      Icon = AlertCircle;
      break;
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${pillStyles}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {status}
    </span>
  );
};
