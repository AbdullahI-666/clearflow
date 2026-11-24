import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";
import { useRoleTheme } from "@/shared/hooks/useRoleTheme";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    subtitle?: string;
  };
  subtitle?: string;
  iconBoxClassName?: string;
  className?: string;
  centered?: boolean;
}

export const KpiCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  iconBoxClassName, 
  className,
  centered = false 
}: KpiCardProps) => {
  const theme = useRoleTheme();
  const boxClass = iconBoxClassName || theme.iconBox;

  if (centered) {
    return (
      <Card className={cn(
        "border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-200 bg-white rounded-2xl group",
        className
      )}>
        <CardContent className="p-6 flex flex-col items-center justify-center text-center w-full min-h-[145px]">
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 mb-2.5 shadow-sm",
            boxClass
          )}>
            {icon}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-600 transition-colors">
            {title}
          </span>
          <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight my-1">
            {value}
          </span>
          {(trend || subtitle) && (
            <div className="mt-1 flex items-center justify-center text-xs flex-wrap gap-1.5">
              {trend && (
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded-md text-[11px] shadow-2xs",
                  trend.isPositive !== false 
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200/80"
                    : "text-rose-700 bg-rose-50 border border-rose-200/80"
                )}>
                  {trend.value}
                </span>
              )}
              <span className="text-gray-500 text-[11px] font-medium">{subtitle || trend?.subtitle || 'vs last week'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-200 bg-white rounded-2xl group",
      className
    )}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between space-x-3">
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-600 transition-colors">
              {title}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {value}
            </span>
          </div>
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-108 group-hover:-translate-y-0.5",
            boxClass
          )}>
            {icon}
          </div>
        </div>
        {(trend || subtitle) && (
          <div className="mt-3.5 flex items-center text-xs flex-wrap gap-1.5">
            {trend && (
              <span className={cn(
                "font-bold px-1.5 py-0.5 rounded-md text-[11px] shadow-2xs",
                trend.isPositive !== false 
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200/80"
                  : "text-rose-700 bg-rose-50 border border-rose-200/80"
              )}>
                {trend.value}
              </span>
            )}
            <span className="text-gray-500 text-[11px] font-medium">{subtitle || trend?.subtitle || 'vs last week'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

