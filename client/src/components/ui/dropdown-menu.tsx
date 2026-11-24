"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle, ChevronDown, Upload, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ==========================================
// 1. ANIMATED DROPDOWN MENU (Framer Motion)
// ==========================================

export type DropdownMenuOption = {
  label: string;
  onClick: () => void;
  Icon?: React.ReactNode;
  count?: number | string;
  badge?: string;
  active?: boolean;
};

export interface AnimatedDropdownMenuProps {
  options: DropdownMenuOption[];
  children?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  roleTheme?: "admin" | "fieldteam" | "client" | "dark" | "default";
  // Preference management
  preferenceKey?: string;
  preferenceLabel?: string;
  currentFilterLabel?: string;
  onUploadPreference?: (preference: string) => void;
  onSavePreference?: () => void;
  showPreferenceActions?: boolean;
}

const themeStyles = {
  admin: {
    button:
      "bg-purple-600 hover:bg-purple-700 text-white shadow-xs border border-purple-500/40 rounded-xl cursor-pointer",
    menu:
      "bg-white border border-purple-200/90 rounded-2xl shadow-xl shadow-purple-950/15 backdrop-blur-md",
    hoverBg: "#f5f3ff",
    activeItem: "bg-purple-600 text-white font-bold shadow-xs",
    text: "text-gray-700 font-medium",
    badge: "bg-purple-50 text-purple-700 border border-purple-200/80 font-mono font-bold",
    activeBadge: "bg-white/25 text-white font-mono font-bold",
    prefBorder: "border-purple-100",
    prefText: "text-gray-600 hover:text-purple-900 hover:bg-purple-50/80",
    prefIcon: "text-purple-600",
    emptyText: "text-gray-400",
  },
  fieldteam: {
    button:
      "bg-amber-600 hover:bg-amber-700 text-white shadow-xs border border-amber-500/40 rounded-xl cursor-pointer",
    menu:
      "bg-white border border-amber-200/90 rounded-2xl shadow-xl shadow-amber-950/15 backdrop-blur-md",
    hoverBg: "#fffbeb",
    activeItem: "bg-amber-600 text-white font-bold shadow-xs",
    text: "text-gray-700 font-medium",
    badge: "bg-amber-50 text-amber-800 border border-amber-200/80 font-mono font-bold",
    activeBadge: "bg-white/25 text-white font-mono font-bold",
    prefBorder: "border-amber-100",
    prefText: "text-gray-600 hover:text-amber-950 hover:bg-amber-50/80",
    prefIcon: "text-amber-600",
    emptyText: "text-gray-400",
  },
  client: {
    button:
      "bg-teal-600 hover:bg-teal-700 text-white shadow-xs border border-teal-500/40 rounded-xl cursor-pointer",
    menu:
      "bg-white border border-teal-200/90 rounded-2xl shadow-xl shadow-teal-950/15 backdrop-blur-md",
    hoverBg: "#f0fdfa",
    activeItem: "bg-teal-600 text-white font-bold shadow-xs",
    text: "text-gray-700 font-medium",
    badge: "bg-teal-50 text-teal-800 border border-teal-200/80 font-mono font-bold",
    activeBadge: "bg-white/25 text-white font-mono font-bold",
    prefBorder: "border-teal-100",
    prefText: "text-gray-600 hover:text-teal-950 hover:bg-teal-50/80",
    prefIcon: "text-teal-600",
    emptyText: "text-gray-400",
  },
  dark: {
    button:
      "bg-[#11111198] hover:bg-[#111111d1] shadow-[0_0_20px_rgba(0,0,0,0.2)] border-none rounded-xl backdrop-blur-sm text-white",
    menu:
      "bg-[#11111198] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm",
    hoverBg: "#11111140",
    activeItem: "bg-white/20 text-white font-bold",
    text: "text-white",
    badge: "bg-white/20 text-white",
    activeBadge: "bg-white text-black",
    prefBorder: "border-white/10",
    prefText: "text-white/80 hover:text-white hover:bg-white/10",
    prefIcon: "text-purple-300",
    emptyText: "text-white/60",
  },
  default: {
    button:
      "bg-[#11111198] hover:bg-[#111111d1] shadow-[0_0_20px_rgba(0,0,0,0.2)] border-none rounded-xl backdrop-blur-sm text-white",
    menu:
      "bg-[#11111198] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm",
    hoverBg: "#11111140",
    activeItem: "bg-white/20 text-white font-bold",
    text: "text-white",
    badge: "bg-white/20 text-white",
    activeBadge: "bg-white text-black",
    prefBorder: "border-white/10",
    prefText: "text-white/80 hover:text-white hover:bg-white/10",
    prefIcon: "text-purple-300",
    emptyText: "text-white/60",
  },
};

const AnimatedDropdownMenu: React.FC<AnimatedDropdownMenuProps> = ({
  options,
  children,
  className,
  triggerClassName,
  menuClassName,
  align = "left",
  roleTheme = "admin",
  preferenceKey,
  preferenceLabel,
  currentFilterLabel,
  onUploadPreference,
  onSavePreference,
  showPreferenceActions = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [computedAlign, setComputedAlign] = useState<"left" | "right">(align);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = themeStyles[roleTheme] || themeStyles.admin;

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Smart Viewport Collision Detection:
  // Automatically prevents the dropdown menu from being cut off on the left or right of the screen
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const estimatedMenuWidth = 280;

      const overflowsRight = rect.left + estimatedMenuWidth > windowWidth - 16;
      const overflowsLeft = rect.right - estimatedMenuWidth < 16;

      if (overflowsRight && !overflowsLeft) {
        setComputedAlign("right");
      } else if (overflowsLeft && !overflowsRight) {
        setComputedAlign("left");
      } else if (align) {
        setComputedAlign(align);
      } else if (rect.left > windowWidth / 2) {
        setComputedAlign("right");
      } else {
        setComputedAlign("left");
      }
    }
  }, [isOpen, align]);

  // Handle window resize while open
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const estimatedMenuWidth = 280;
        if (rect.left + estimatedMenuWidth > windowWidth - 16) {
          setComputedAlign("right");
        } else if (rect.right - estimatedMenuWidth < 16) {
          setComputedAlign("left");
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Handle Uploading a Preference JSON File
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const preferredFilter =
          parsed.filter || parsed.defaultFilter || parsed.preference || parsed.value;
        if (preferredFilter) {
          if (preferenceKey) {
            localStorage.setItem(preferenceKey, preferredFilter);
          }
          if (onUploadPreference) {
            onUploadPreference(preferredFilter);
          } else {
            // Find and click the matching option if available
            const match = options.find(
              (o) => o.label.toLowerCase() === String(preferredFilter).toLowerCase()
            );
            if (match) {
              match.onClick();
            }
          }
          toast.success(
            `Filter preference uploaded: "${preferredFilter}" applied and saved as default!`
          );
        } else {
          toast.error("Invalid preference file format. Expected JSON with { defaultFilter: '...' }");
        }
      } catch (err) {
        toast.error("Could not parse JSON preference file. Please check format.");
      }
      setIsOpen(false);
    };
    reader.readAsText(file);
    // Reset input so same file can be reselected
    e.target.value = "";
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <Button
        type="button"
        onClick={toggleDropdown}
        className={cn(
          "h-10 px-3.5 border rounded-xl backdrop-blur-sm cursor-pointer inline-flex items-center gap-2 transition-all select-none text-white",
          theme.button,
          triggerClassName
        )}
      >
        {children ?? "Menu"}
        <motion.span
          className="inline-flex items-center shrink-0 ml-0.5"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4 text-white/90" />
        </motion.span>
      </Button>

      {/* Hidden file input for uploading filter preference */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileUpload}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: -5, scale: 0.95, filter: "blur(10px)", opacity: 0 }}
            animate={{ y: 0, scale: 1, filter: "blur(0px)", opacity: 1 }}
            exit={{ y: -5, scale: 0.95, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.35, ease: "circInOut", type: "spring" }}
            className={cn(
              "absolute z-50 min-w-[240px] sm:min-w-[260px] w-max max-w-[calc(100vw-2rem)] mt-2 p-1.5 rounded-2xl shadow-xl flex flex-col gap-1",
              computedAlign === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
              theme.menu,
              menuClassName
            )}
          >
            {/* Options list */}
            {options && options.length > 0 ? (
              <div className="max-h-[460px] overflow-y-auto overscroll-contain flex flex-col gap-1 pr-0.5">
                {options.map((option, index) => (
                  <motion.button
                    type="button"
                    initial={{
                      opacity: 0,
                      x: 10,
                      scale: 0.95,
                      filter: "blur(10px)",
                    }}
                    animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{
                      opacity: 0,
                      x: 10,
                      scale: 0.95,
                      filter: "blur(10px)",
                    }}
                    transition={{
                      duration: 0.25,
                      delay: index * 0.025,
                      ease: "easeInOut",
                      type: "spring",
                    }}
                    whileHover={{
                      backgroundColor: theme.hoverBg,
                      transition: {
                        duration: 0.15,
                        ease: "easeInOut",
                      },
                    }}
                    whileTap={{
                      scale: 0.97,
                      transition: {
                        duration: 0.1,
                        ease: "easeInOut",
                      },
                    }}
                    key={option.label}
                    onClick={() => {
                      option.onClick();
                      setIsOpen(false);
                    }}
                    className={cn(
                      "px-3.5 py-2.5 cursor-pointer text-sm rounded-xl w-full text-left flex items-center justify-between gap-x-4 transition-colors select-none",
                      option.active ? theme.activeItem : theme.text
                    )}
                  >
                    <div className="flex items-center gap-x-2.5 min-w-0">
                      {option.Icon}
                      <span className="font-semibold text-sm whitespace-nowrap">{option.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto pl-3">
                      {option.badge && (
                        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", theme.badge)}>
                          {option.badge}
                        </span>
                      )}
                      {option.count !== undefined && (
                        <span
                          className={cn(
                            "min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full text-xs font-mono font-bold leading-none shrink-0",
                            option.active ? theme.activeBadge : theme.badge
                          )}
                        >
                          {option.count}
                        </span>
                      )}
                      {option.active && <Check className="w-4 h-4 ml-0.5 shrink-0 text-white stroke-[2.5]" />}
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className={cn("px-4 py-2 text-xs", theme.emptyText)}>No options</div>
            )}

            {/* Preference Actions (Upload Preference Only) */}
            {showPreferenceActions && onUploadPreference && (
              <div className={cn("pt-1.5 mt-1 border-t flex flex-col gap-0.5", theme.prefBorder)}>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className={cn("px-3 py-2 text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors font-semibold", theme.prefText)}
                >
                  <Upload className={cn("w-3.5 h-3.5", theme.prefIcon)} />
                  <span>Upload Filter Preference (.json)</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 2. POLYMORPHIC / COMPOSABLE EXPORT
// ==========================================

export interface RadixDropdownMenuProps extends DropdownMenuPrimitive.DropdownMenuProps {
  options?: never;
}

export type DropdownMenuProps =
  | (AnimatedDropdownMenuProps & { modal?: never })
  | (DropdownMenuPrimitive.DropdownMenuProps & { options?: never });

const DropdownMenu = (props: any) => {
  if (props && Array.isArray(props.options)) {
    return <AnimatedDropdownMenu {...props} />;
  }
  const { modal = false, ...rest } = props;
  return <DropdownMenuPrimitive.Root modal={modal} {...rest} />;
};

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

const DropdownMenuArrow = DropdownMenuPrimitive.Arrow;

export {
  DropdownMenu,
  AnimatedDropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuArrow,
};
