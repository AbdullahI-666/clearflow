import { cn } from "@/lib/utils";
import { Link, NavLink, useLocation } from "react-router-dom";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  badge?: React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPinned: boolean;
  setIsPinned: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, isPinned, setIsPinned, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, isPinned, setIsPinned, animate } = useSidebar();
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();
  const hoverTimerRef = React.useRef<any>(null);

  // Reset pinned and close on route change
  React.useEffect(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsPinned(false);
    setOpen(false);
  }, [location.pathname, setIsPinned, setOpen]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setIsPinned(false);
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setIsPinned, setOpen]);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!isPinned) {
      hoverTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, 70);
    }
  };

  const handleClick = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsPinned(true);
    setOpen(true);
  };

  return (
    <motion.div
      ref={sidebarRef}
      className={cn(
        "h-fit max-h-[calc(100vh-6rem)] hidden md:flex md:flex-col shrink-0 z-40 overflow-hidden",
        className,
        open 
          ? "!bg-white shadow-2xl rounded-2xl" 
          : "!bg-transparent border-none shadow-none"
      )}
      style={{
        willChange: "width, transform",
        backgroundColor: open ? "#ffffff" : "transparent",
        borderTop: "1px solid",
        borderRight: "1px solid",
        borderBottom: "1px solid",
        borderLeft: open ? "1px solid" : "none",
        borderColor: open ? "rgba(226, 232, 240, 0.9)" : "transparent",
        borderRadius: open ? "1.25rem" : "0",
        boxShadow: open ? "0 20px 40px -15px rgba(0, 0, 0, 0.12)" : "0 0 0 0 transparent",
      }}
      animate={{
        width: animate ? (open ? "272px" : "68px") : "272px",
      }}
      transition={{
        duration: 0.18,
        ease: [0.25, 1, 0.5, 1],
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white w-full"
      )}
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <Menu
          className="text-neutral-800 cursor-pointer"
          onClick={() => setOpen(!open)}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: "easeInOut",
            }}
            className={cn(
              "fixed h-full w-full inset-0 bg-white p-6 z-[100] flex flex-col justify-between shadow-2xl",
              className
            )}
          >
            <div
              className="absolute right-6 top-6 z-50 text-neutral-800 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              onClick={() => setOpen(!open)}
            >
              <X className="w-5 h-5" />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  activeClassName,
  activeIconClassName,
  hoverClassName,
  onClick,
  ...props
}: {
  link: Links;
  className?: string;
  activeClassName?: string;
  activeIconClassName?: string;
  hoverClassName?: string;
  onClick?: (e?: React.MouseEvent) => void;
  [key: string]: any;
}) => {
  const { open, setOpen, setIsPinned, animate } = useSidebar();
  const location = useLocation();

  const isDashboardRoute =
    link.href === "/dashboard" &&
    (location.pathname === "/" ||
      location.pathname === "/dashboard" ||
      location.pathname === "/admin/dashboard" ||
      location.pathname === "/team/dashboard" ||
      location.pathname === "/client/dashboard");

  const isMatch = (navLinkActive: boolean) => {
    if (isDashboardRoute) return true;
    const [linkPath, linkQuery] = link.href.split('?');
    if (linkQuery) {
      return location.pathname === linkPath && location.search.includes(linkQuery);
    }
    if (navLinkActive) return true;
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
      (linkPath === "/work-history" && location.pathname.startsWith("/work-orders"))
    ) {
      return true;
    }
    return false;
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    setIsPinned(false);
    setOpen(false);
    if (link.href === '/wallet') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('clearflow:open-wallet'));
    }
    if (onClick) onClick(e);
  };

  return (
    <NavLink
      to={link.href}
      onClick={handleLinkClick}
      className={({ isActive: navLinkActive }) => {
        const isActive = isMatch(navLinkActive);
        return cn(
          "flex items-center rounded-xl font-medium h-11 w-full select-none",
          open ? "gap-3.5 px-3 justify-start" : "gap-0 px-0 justify-center",
          "transition-colors duration-150 relative",
          isActive
            ? (open
                ? (activeClassName || "bg-purple-100/90 text-purple-900 font-bold rounded-xl")
                : "bg-transparent text-purple-700 font-semibold border-0 border-transparent shadow-none")
            : (open
                ? (hoverClassName || "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl border-0 border-transparent")
                : "text-slate-500 hover:text-slate-900 hover:bg-transparent border-0 border-transparent"),
          className
        );
      }}
      {...props}
    >
      {({ isActive: navLinkActive }) => {
        const isActive = isMatch(navLinkActive);
        return (
          <>
            <div
              className={cn(
                "shrink-0 flex items-center justify-center w-5 h-5 transition-colors",
                isActive
                  ? (activeIconClassName || "text-purple-600")
                  : "text-slate-500 group-hover/sidebar:text-slate-800"
              )}
            >
              {link.icon}
            </div>
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                x: open ? 0 : -6,
              }}
              transition={{
                duration: open ? 0.16 : 0.08,
                delay: open ? 0.08 : 0,
                ease: "easeOut",
              }}
              className={cn(
                "text-sm font-medium whitespace-nowrap overflow-hidden transition-colors select-none",
                open ? "flex-1 relative" : "absolute w-0 opacity-0 overflow-hidden pointer-events-none",
                isActive ? "font-semibold" : "text-slate-700 group-hover/sidebar:text-slate-900"
              )}
            >
              {link.label}
            </motion.span>
            {link.badge && open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="ml-auto shrink-0"
              >
                {link.badge}
              </motion.div>
            )}
          </>
        );
      }}
    </NavLink>
  );
};
