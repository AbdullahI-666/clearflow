import * as React from "react";
import { Kbd } from "@/components/ui/kbd";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

//  ------------------------------ | KBD - INPUT GROUP | ------------------------------  //

export interface KbdInputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
  roleTheme?: 'admin' | 'fieldteam' | 'client';
  hideKbd?: boolean;
  centerText?: boolean;
}

export function KbdInputGroup({
  wrapperClassName,
  className,
  placeholder = "Search...",
  roleTheme,
  hideKbd = true,
  centerText = true,
  ...props
}: KbdInputGroupProps) {
  const themeClasses = {
    admin: "border-purple-300 hover:border-purple-400 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-400/25 bg-white",
    fieldteam: "border-amber-300 hover:border-amber-400 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/25 bg-white",
    client: "border-teal-300 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-400/25 bg-white",
  };

  const activeTheme = roleTheme ? themeClasses[roleTheme] : "border-gray-200 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200 bg-white";

  return (
    <div className={cn("flex w-full flex-col", wrapperClassName)}>
      <div className={cn("rounded-full border h-9.5 px-3.5 flex items-center transition-all duration-200 shadow-2xs relative", activeTheme)}>
        <SearchIcon className={cn("w-4 h-4 text-gray-400 shrink-0", centerText ? "absolute left-3.5" : "mr-2.5")} />
        <input
          type="text"
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
            centerText && "text-center placeholder:text-center px-6",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}

export default KbdInputGroup;
