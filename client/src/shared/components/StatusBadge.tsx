import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Check } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-700';
  let Icon = CheckCircle2;

  switch (status.toLowerCase()) {
    case 'open':
    case 'unassigned':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-700';
      Icon = AlertCircle;
      break;
    case 'in progress':
    case 'on job':
      bgColor = 'bg-teal-100';
      textColor = 'text-teal-700';
      Icon = Clock;
      break;
    case 'pending review':
      bgColor = 'bg-amber-100';
      textColor = 'text-amber-700';
      Icon = Clock;
      break;
    case 'completed':
    case 'available':
      bgColor = 'bg-emerald-100';
      textColor = 'text-emerald-700';
      Icon = Check;
      break;
    case 'flagged':
      bgColor = 'bg-red-100';
      textColor = 'text-red-700';
      Icon = AlertCircle;
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </span>
  );
};
