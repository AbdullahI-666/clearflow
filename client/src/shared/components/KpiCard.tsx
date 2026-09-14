import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    subtitle?: string;
  };
  subtitle?: string;
}

export const KpiCard = ({ title, value, icon, trend, subtitle }: KpiCardProps) => {
  return (
    <Card className="shadow-sm border-gray-100 hover:shadow-md transition-shadow duration-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
            <span className="text-2xl font-bold text-gray-900">{value}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            {icon}
          </div>
        </div>
        {(trend || subtitle) && (
          <div className="mt-3 flex items-center text-xs">
            {trend && (
              <span className={`font-medium ${trend.isPositive !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend.value}
              </span>
            )}
            <span className="ml-1 text-gray-500">{subtitle || trend?.subtitle || 'vs last week'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
