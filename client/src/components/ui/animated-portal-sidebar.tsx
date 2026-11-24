"use client";

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  gradient?: string;
  hoverGradient?: string;
}

export type PortalRole = "admin" | "fieldteam" | "client";

interface AnimatedPortalSidebarProps {
  items: PortalNavItem[];
  role: PortalRole;
  showOnMobile?: boolean;
  onItemClick?: (item: PortalNavItem, e: React.MouseEvent) => void;
}

// Role-specific default gradients if not provided on individual items
const ROLE_GRADIENT_PALETTES: Record<
  PortalRole,
  {
    gradient: string;
    hoverGradient: string;
    iconColor: string;
    restingBorder: string;
    activeBorder: string;
    fabGradient: string;
  }
> = {
  admin: {
    gradient: "from-purple-700 via-indigo-600 to-purple-500",
    hoverGradient: "from-purple-600 via-indigo-500 to-purple-400",
    iconColor: "text-purple-600",
    restingBorder: "border-purple-200/80 hover:border-purple-300",
    activeBorder: "border-purple-300",
    fabGradient: "from-purple-700 via-indigo-600 to-purple-500",
  },
  fieldteam: {
    gradient: "from-amber-600 via-orange-600 to-amber-500",
    hoverGradient: "from-amber-500 via-orange-500 to-amber-400",
    iconColor: "text-amber-600",
    restingBorder: "border-amber-200/80 hover:border-amber-300",
    activeBorder: "border-amber-300",
    fabGradient: "from-amber-600 via-orange-600 to-amber-500",
  },
  client: {
    gradient: "from-teal-600 via-emerald-600 to-teal-500",
    hoverGradient: "from-teal-500 via-emerald-500 to-teal-400",
    iconColor: "text-teal-600",
    restingBorder: "border-teal-200/80 hover:border-teal-300",
    activeBorder: "border-teal-300",
    fabGradient: "from-teal-600 via-emerald-600 to-teal-500",
  },
};

// Portal-specific typography nuances for distinctive personality
const ROLE_TYPOGRAPHY_STYLES: Record<
  PortalRole,
  {
    textClass: string;
  }
> = {
  admin: {
    textClass: "font-sidebar-title text-[12px] font-bold tracking-[0.03em] uppercase",
  },
  fieldteam: {
    textClass: "font-sidebar-title text-[13px] font-bold tracking-[0.025em]",
  },
  client: {
    textClass: "font-sidebar-title text-[13px] font-semibold tracking-[0.02em]",
  },
};

export const AnimatedPortalSidebar: React.FC<AnimatedPortalSidebarProps> = ({
  items,
  role,
  showOnMobile = true,
  onItemClick,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mobileDockOpen, setMobileDockOpen] = useState(false);

  const roleStyle = ROLE_GRADIENT_PALETTES[role] || ROLE_GRADIENT_PALETTES.client;
  const roleTypography = ROLE_TYPOGRAPHY_STYLES[role] || ROLE_TYPOGRAPHY_STYLES.client;

  const isItemActive = (href: string) => {
    const isDashboardRoute =
      href === "/dashboard" &&
      (location.pathname === "/" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/admin/dashboard" ||
        location.pathname === "/team/dashboard" ||
        location.pathname === "/client/dashboard");

    if (isDashboardRoute) return true;

    const [linkPath, linkQuery] = href.split("?");
    if (linkQuery) {
      return location.pathname === linkPath && location.search.includes(linkQuery);
    }
    if (
      linkPath !== "/" &&
      linkPath !== "/dashboard" &&
      location.pathname.startsWith(linkPath)
    ) {
      return true;
    }
    if (
      (linkPath === "/payments" && location.pathname.startsWith("/invoices")) ||
      (linkPath === "/invoices" && location.pathname.startsWith("/payments")) ||
      (linkPath === "/work-orders" && location.pathname.startsWith("/work-history")) ||
      (linkPath === "/work-history" && location.pathname.startsWith("/work-orders")) ||
      (linkPath === "/reviews" && location.pathname.startsWith("/ratings-and-reviews")) ||
      (linkPath === "/ratings-and-reviews" && location.pathname.startsWith("/reviews"))
    ) {
      return true;
    }
    return false;
  };

  const handleAction = (item: PortalNavItem, e: React.MouseEvent) => {
    if (onItemClick) {
      onItemClick(item, e);
    }

    const [path, query] = item.href.split("?");
    if (query) {
      navigate({ pathname: path, search: `?${query}` });
    } else {
      navigate(item.href);
    }
  };

  return (
    <>
      {/* ===== Desktop Sliding Edge Sidebar (Vertically Centered Below Header) ===== */}
      <aside
        aria-label="Portal Navigation"
        className="hidden lg:flex flex-col justify-center fixed top-[calc(50%+2.25rem)] -translate-y-1/2 left-0 z-40 max-h-[calc(100vh-6rem)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 pointer-events-none select-none"
      >
        <ul className="space-y-1.5 pointer-events-auto">
          {items.map((item, idx) => {
            const isActive = isItemActive(item.href);
            const isHovered = hoveredIndex === idx;
            const gradient = item.gradient || roleStyle.gradient;
            const hoverGradient = item.hoverGradient || roleStyle.hoverGradient;

            return (
              <li
                key={`${item.href}-${idx}`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group relative"
              >
                <button
                  type="button"
                  onClick={(e) => handleAction(item, e)}
                  title={item.label}
                  className={cn(
                    "flex items-center justify-between w-52 h-10",
                    "transition-all duration-500 ease-out",
                    "rounded-r-2xl relative overflow-hidden border",
                    "cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                    isActive
                      ? "ml-[-160px] group-hover:ml-0 border-white/40 shadow-md"
                      : cn("ml-[-160px] group-hover:ml-0 bg-white/95 shadow-2xs hover:shadow-xl hover:border-white/40", roleStyle.restingBorder)
                  )}
                >
                  {/* Dynamic Gradient Overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-r",
                      isHovered ? hoverGradient : gradient,
                      isActive
                        ? "opacity-95"
                        : "opacity-0 group-hover:opacity-95",
                      "transition-all duration-500"
                    )}
                  />

                  {/* Active Indicator Accent on Left Edge */}
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full shadow-sm z-20" />
                  )}

                  {/* Text Label & Optional Badge - Revealed smoothly on Hover */}
                  <div className="flex-1 min-w-0 flex items-center pl-3.5 pr-1 relative z-10 overflow-hidden">
                    <span
                      className={cn(
                        roleTypography.textClass,
                        "text-white transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis mr-1",
                        "opacity-0 group-hover:opacity-100 group-hover:tracking-wider",
                        "drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                      )}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0 scale-90">
                        {item.badge}
                      </div>
                    )}
                  </div>

                  {/* Right End: Dead-Centered Icon Slot (48px wide) */}
                  <div className="w-12 h-full flex items-center justify-center shrink-0 relative z-10">
                    {/* Small Unread Ping Indicator for Rest State */}
                    {item.badge && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}

                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center transition-all duration-500",
                        isActive || isHovered
                          ? "text-white scale-110 group-hover:scale-125 drop-shadow-sm"
                          : `${roleStyle.iconColor} group-hover:text-white group-hover:scale-125`
                      )}
                    >
                      {item.icon}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ===== Mobile Floating Dock (Bottom-Right Action Menu) ===== */}
      {showOnMobile && (
        <div className="lg:hidden fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] right-[max(1.25rem,env(safe-area-inset-right,1.25rem))] z-50">
          {/* Backdrop Blur Overlay */}
          {mobileDockOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
              onClick={() => setMobileDockOpen(false)}
            />
          )}

          <div className="relative">
            {/* Staggered Floating Icons */}
            <div
              className={cn(
                "absolute bottom-18 right-0 flex flex-col-reverse gap-2.5 max-h-[calc(100dvh-8rem)] overflow-y-auto touch-scroll pr-1 pb-1 transition-all duration-500",
                mobileDockOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-8 pointer-events-none"
              )}
            >
              {items.map((item, index) => {
                const isActive = isItemActive(item.href);
                const gradient = item.gradient || roleStyle.gradient;

                return (
                  <button
                    key={`mobile-${item.href}-${index}`}
                    type="button"
                    onClick={(e) => {
                      setMobileDockOpen(false);
                      handleAction(item, e);
                    }}
                    className="group relative ml-auto flex items-center cursor-pointer"
                    style={{
                      transitionDelay: mobileDockOpen ? `${index * 45}ms` : "0ms",
                    }}
                  >
                    {/* Tooltip Label */}
                    <div
                      className={cn(
                        "absolute right-14 bg-white text-gray-900 border border-gray-200/90 font-sidebar-title text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap transition-opacity",
                        mobileDockOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {item.label}
                      <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-white border-r border-t border-gray-200/90 rotate-45" />
                    </div>

                    {/* Circular Icon Pill */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
                        "border border-white/20 text-white",
                        `bg-gradient-to-br ${gradient}`,
                        isActive && "ring-2 ring-white ring-offset-2 ring-offset-black/20 scale-105"
                      )}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        {item.icon}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main Floating Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileDockOpen(!mobileDockOpen)}
              className={cn(
                "relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl active:scale-95",
                "transition-all duration-300 border border-white/25 text-white overflow-hidden cursor-pointer",
                `bg-gradient-to-br ${roleStyle.fabGradient}`
              )}
              aria-label="Toggle Portal Navigation"
            >
              <div className="relative z-10 transition-transform duration-300">
                {mobileDockOpen ? (
                  <X className="w-6 h-6 animate-in spin-in-90 duration-200" />
                ) : (
                  <Compass className="w-6 h-6 animate-in zoom-in-75 duration-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AnimatedPortalSidebar;
