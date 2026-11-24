import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  ArchiveIcon,
  BellIcon,
  CalendarIcon,
  MessageCircleDashed,
  MessageCircleIcon,
  PlusIcon,
  TypeIcon,
  UserIcon,
  FilterIcon,
  XIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  Banknote,
  Trash2,
} from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { apiClient } from "@/infrastructure/api/client"
import { ENDPOINTS } from "@/infrastructure/api/endpoints"
import { useAuth } from "@/entities/user/hooks/useAuth"
import { socketClient } from "@/infrastructure/socket/client"
import { toast } from "sonner"
import { triggerPopupNotification } from "@/shared/components/RightPopupNotifications"

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

export const isWorkerRole = (role?: string) => {
  const r = (role || "").toLowerCase();
  return r === "fieldteam" || r === "field_team" || r === "field-team" || r === "field" || r === "worker";
};

export const isAdminRole = (role?: string) => {
  return (role || "").toLowerCase() === "admin";
};

export type TabValue = "all" | "unread" | "archived"

export interface NotificationItem {
  id: string
  title: string
  message?: string
  timeAgo: string
  timestamp?: Date | string
  isRead: boolean
  isArchived?: boolean
  type?: string
  workOrderId?: string
  author?: string
  clientName?: string
  workerName?: string
  workOrderCode?: string
}

const WO_DIRECTORY: Record<string, { client: string; worker: string }> = {};

function getNotificationDetails(item: { title?: string; message?: string; workOrderId?: string; clientName?: string; workerName?: string; metadata?: any }) {
  let woCode = item.workOrderId || item.metadata?.workOrderId || item.metadata?.workOrderCode;
  const combined = `${item.title || ''} ${item.message || ''}`;
  const codeMatch = combined.match(/WO-2026-\d{4}/);
  if (codeMatch) {
    woCode = codeMatch[0];
  }

  const lookup = woCode && WO_DIRECTORY[woCode] ? WO_DIRECTORY[woCode] : null;

  let clientName = item.clientName || item.metadata?.clientName || lookup?.client;
  let workerName = item.workerName || item.metadata?.workerName || lookup?.worker;

  const isGenericClient = !clientName || clientName.trim().toLowerCase() === 'client';
  const isGenericWorker = !workerName || ['worker', 'field team', 'fieldteam'].includes(workerName.trim().toLowerCase());

  if (isGenericClient) clientName = undefined;
  if (isGenericWorker) workerName = undefined;

  // Never attach client/worker tags to welcome, registration, or general non-work-order notifications
  if (!woCode) {
    clientName = undefined;
    workerName = undefined;
  }

  return { woCode, clientName, workerName };
}

export const cleanFieldTeamText = (text?: string): string => {
  if (!text) return "";
  return text
    .replace(/ClearFlow\s+Field\s+Team/gi, "ClearFlow")
    .replace(/\s*\(\s*Field\s+Team\s*\)/gi, "")
    .replace(/Field\s+Team\s+Started\s+Work/gi, "Technician Started Work")
    .replace(/Accepted\s+by\s+Field\s+Team/gi, "Accepted")
    .replace(/Declined\s+by\s+Field\s+Team/gi, "Declined")
    .replace(/Completed\s+by\s+Field\s+Team/gi, "Completed")
    .replace(/by\s+Field\s+Team/gi, "by Technician")
    .replace(/Field\s+team\s+has\s+begun/gi, "Technician has begun")
    .replace(/Field\s+team\s+accepted/gi, "Technician accepted")
    .replace(/Field\s+team\s+declined/gi, "Technician declined")
    .replace(/Field\s+team\s+payout/gi, "Technician payout")
    .replace(/Field\s+teams/gi, "Technicians")
    .replace(/field\s+teams/gi, "technicians")
    .replace(/Field\s+team\s+technicians/gi, "Technicians")
    .replace(/field\s+team\s+technicians/gi, "technicians")
    .replace(/Field\s+Team/gi, "Technician")
    .replace(/field\s+team/gi, "technician");
};

const getDeletedNotifIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem("clearflow_deleted_notification_ids");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

interface NotificationContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  onClose: () => void
  notifications: NotificationItem[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  archiveNotification: (id: string) => void
  deleteNotification: (id: string) => void
  handleNotificationClick: (item: NotificationItem) => void
  activeRole: string
}

const NotificationContext = React.createContext<NotificationContextValue | undefined>(undefined)

function useNotification() {
  const ctx = React.useContext(NotificationContext)
  if (!ctx) throw new Error("useNotification must be within provider")
  return ctx
}

// Fallback demo notifications for real-time facility operations
const DEFAULT_FACILITY_NOTIFICATIONS: NotificationItem[] = [];

function formatTimeAgo(dateInput?: Date | string): string {
  if (!dateInput) return "just now"
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}

export function VercelNotificationPopover() {
  const [open, setOpen] = React.useState(false)
  const handleClose = () => setOpen(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const activeRole = (user?.role || "Client").toLowerCase()

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])

  // Load notifications from backend or fallback to initial facility list
  const fetchNotifications = React.useCallback(async () => {
    try {
      const isAllMarked = localStorage.getItem("clearflow_all_notifications_read") === "true"
      let readSet = new Set<string>()
      try {
        const raw = localStorage.getItem("clearflow_read_notifications")
        readSet = new Set(raw ? JSON.parse(raw) : [])
      } catch (_) {}

      const res = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE)
      const deletedSet = getDeletedNotifIds()
      if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        const mapped: NotificationItem[] = res.data.data
          .filter((n: any) => !deletedSet.has(n._id || n.id))
          .map((n: any, idx: number) => {
          const id = n._id || n.id || `notif-api-${idx}`
          const isReadServer = Boolean(n.isRead !== undefined ? n.isRead : n.is_read)
          const isRead = isAllMarked || readSet.has(id) || isReadServer
          const { woCode, clientName, workerName } = getNotificationDetails(n)
          return {
            id,
            title: cleanFieldTeamText(n.title || "Facility Notification"),
            message: cleanFieldTeamText(n.message || ""),
            timeAgo: formatTimeAgo(n.createdAt || n.sentAt),
            timestamp: n.createdAt || n.sentAt || new Date(),
            isRead,
            isArchived: false,
            type: n.type || "StatusUpdate",
            workOrderId: woCode,
            workOrderCode: woCode,
            clientName,
            workerName,
            author: n.type?.includes("Ai") ? "AI Auditor" : n.type?.includes("Invoice") ? "Finance" : "Operations",
          }
        })
        setNotifications(mapped)
      } else {
        setNotifications(
          DEFAULT_FACILITY_NOTIFICATIONS
            .filter((n) => !deletedSet.has(n.id))
            .map((n) => ({
              ...n,
              isRead: isAllMarked || readSet.has(n.id) || n.isRead,
            }))
        )
      }
    } catch {
      const isAllMarked = localStorage.getItem("clearflow_all_notifications_read") === "true"
      const deletedSet = getDeletedNotifIds()
      let readSet = new Set<string>()
      try {
        const raw = localStorage.getItem("clearflow_read_notifications")
        readSet = new Set(raw ? JSON.parse(raw) : [])
      } catch (_) {}

      setNotifications(
        DEFAULT_FACILITY_NOTIFICATIONS
          .filter((n) => !deletedSet.has(n.id))
          .map((n) => ({
            ...n,
            isRead: isAllMarked || readSet.has(n.id) || n.isRead,
          }))
      )
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)

    // Socket real-time push listener
    socketClient.connect()
    const socket = socketClient.getSocket()
    if (socket) {
      const handleNewNotification = (newNotif: any) => {
        if (!newNotif) return
        localStorage.removeItem("clearflow_all_notifications_read")
        setNotifications((prev) => [
          {
            id: newNotif._id || `notif-socket-${Date.now()}`,
            title: cleanFieldTeamText(newNotif.title || "New notification"),
            message: cleanFieldTeamText(newNotif.message || ""),
            timeAgo: "just now",
            timestamp: new Date(),
            isRead: false,
            isArchived: false,
            type: newNotif.type || "StatusUpdate",
            workOrderId: newNotif.workOrderCode || newNotif.metadata?.workOrderCode || newNotif.workOrderId || newNotif.metadata?.workOrderId,
            author: "Operations",
          },
          ...prev,
        ])

        // Trigger real-time right popup notification
        triggerPopupNotification({
          id: newNotif._id,
          title: cleanFieldTeamText(newNotif.title || "New Notification"),
          description: cleanFieldTeamText(newNotif.message || "ClearFlow Operations Update"),
          type: newNotif.type || "event",
          workOrderId: newNotif.workOrderId || newNotif.metadata?.workOrderId,
        })
      }
      socket.on("notification:new", handleNewNotification)
      socket.on("notification", handleNewNotification)
      socket.on("work_order_created", fetchNotifications)
      socket.on("work_order_updated", fetchNotifications)
      return () => {
        socket.off("notification:new", handleNewNotification)
        socket.off("notification", handleNewNotification)
        socket.off("work_order_created", fetchNotifications)
        socket.off("work_order_updated", fetchNotifications)
        clearInterval(timer)
      }
    }

    return () => clearInterval(timer)
  }, [fetchNotifications])

  React.useEffect(() => {
    const handleGlobalMarkAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    }
    const handleGlobalReadOne = (e: any) => {
      const id = e?.detail?.id
      if (id) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      }
    }

    window.addEventListener("clearflow:notifications-read-all", handleGlobalMarkAllRead)
    window.addEventListener("clearflow:notification-read", handleGlobalReadOne)
    return () => {
      window.removeEventListener("clearflow:notifications-read-all", handleGlobalMarkAllRead)
      window.removeEventListener("clearflow:notification-read", handleGlobalReadOne)
    }
  }, [])

  const markAsRead = React.useCallback(async (id: string) => {
    try {
      if (id && !id.startsWith("notif-api-") && !id.startsWith("notif-socket-")) {
        await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id))
      }
    } catch (_) {}
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    try {
      const raw = localStorage.getItem("clearflow_read_notifications")
      const set = new Set(raw ? JSON.parse(raw) : [])
      set.add(id)
      localStorage.setItem("clearflow_read_notifications", JSON.stringify(Array.from(set)))
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("clearflow:notification-read", { detail: { id } }))
  }, [])

  const markAllAsRead = React.useCallback(async () => {
    try {
      await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ)
    } catch (_) {}
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    localStorage.setItem("clearflow_all_notifications_read", "true")
    try {
      const raw = localStorage.getItem("clearflow_read_notifications")
      const set = new Set(raw ? JSON.parse(raw) : [])
      notifications.forEach((n) => set.add(n.id))
      localStorage.setItem("clearflow_read_notifications", JSON.stringify(Array.from(set)))
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("clearflow:notifications-read-all"))
    toast.success("All notifications marked as read")
  }, [notifications])

  const archiveNotification = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: true, isRead: true } : n))
    )
    toast.success("Notification archived")
  }, [])

  const deleteNotification = React.useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      const deleted = getDeletedNotifIds()
      deleted.add(id)
      localStorage.setItem("clearflow_deleted_notification_ids", JSON.stringify(Array.from(deleted)))
      if (id && !id.startsWith("notif-") && !id.startsWith("notif_")) {
        await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(id)).catch(() => null)
      }
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('clearflow:notification-deleted', { detail: { id } }))
    toast.success("Notification deleted")
  }, [])

  const handleNotificationClick = React.useCallback(
    (item: NotificationItem) => {
      markAsRead(item.id)
      handleClose()
      const { woCode } = getNotificationDetails(item)
      if (item.type?.includes("Invoice") && activeRole === "admin") {
        navigate("/invoices")
      } else if (woCode) {
        navigate(`/work-orders/${woCode}`)
      } else {
        navigate("/notifications")
      }
    },
    [markAsRead, navigate, activeRole]
  )

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.isRead && !n.isArchived).length,
    [notifications]
  )

  return (
    <NotificationContext.Provider
      value={{
        open,
        setOpen,
        onClose: handleClose,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        archiveNotification,
        deleteNotification,
        handleNotificationClick,
        activeRole,
      }}
    >
      <NotificationContent />
    </NotificationContext.Provider>
  )
}

function NotificationContent() {
  const isMobile = useIsMobile()
  if (isMobile) return <NotificationSheet />
  return <NotificationPopover />
}

// ─── Desktop Popover ───
function NotificationPopover() {
  const { open, setOpen } = useNotification()
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <PopoverPrimitive.Trigger asChild>
        <TriggerButton />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={4}
          alignOffset={8}
          className="z-[9999] w-[420px] rounded-2xl border border-gray-200/80 bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-hidden flex flex-col font-sans"
          style={{ maxHeight: "55dvh" }}
        >
          <UnderLineTabs />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

// ─── Mobile Sheet ───
function NotificationSheet() {
  const { open, setOpen, onClose } = useNotification()

  return (
    <>
      <TriggerButton onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom font-sans shadow-2xl"
            style={{ height: "55dvh", maxHeight: "55dvh" }}
          >
            <UnderLineTabs />
          </div>
        </div>
      )}
    </>
  )
}

// ─── Trigger Button ───
const TriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { unreadCount, activeRole } = useNotification()
  const hasUnread = unreadCount > 0
  const isWorker = isWorkerRole(activeRole)
  const isAdmin = isAdminRole(activeRole)

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl border border-transparent bg-transparent p-2.5 text-sm font-medium text-gray-700 hover:bg-black/5 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 shadow-none transition-all cursor-pointer",
        isWorker ? "focus-visible:ring-orange-500" : isAdmin ? "focus-visible:ring-purple-500" : "focus-visible:ring-teal-500"
      )}
      aria-label="Notifications"
    >
      <BellIcon className="h-4 w-4 text-gray-700" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 pointer-events-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              isWorker ? "bg-orange-500" : isAdmin ? "bg-purple-500" : "bg-emerald-500"
            )} />
            <span className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full",
              isWorker ? "bg-orange-500" : isAdmin ? "bg-purple-500" : "bg-emerald-500"
            )} />
          </span>
        </span>
      )}
    </button>
  )
})
TriggerButton.displayName = "TriggerButton"

// ─── Tabs ───
function UnderLineTabs() {
  const { onClose, activeRole, markAllAsRead, unreadCount } = useNotification()
  const [tab, setTab] = React.useState<TabValue>("all")
  const navigate = useNavigate()
  const isWorker = isWorkerRole(activeRole)
  const isAdmin = isAdminRole(activeRole)

  return (
    <div className="flex flex-col h-full bg-white text-gray-900">
      {/* Tab bar */}
      <div className="flex justify-between items-center h-14 border-b border-gray-200 px-1 flex-shrink-0 bg-white">
        <div className="flex h-full">
          {(["all", "unread", "archived"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 h-full text-sm font-medium capitalize relative transition-colors cursor-pointer flex items-center",
                tab === t 
                  ? cn("font-bold", isWorker ? "text-orange-950" : isAdmin ? "text-purple-950" : "text-gray-900") 
                  : "text-gray-400 hover:text-gray-700"
              )}
            >
              {t === "all" ? "All" : t === "unread" ? "Unread" : "Archived"}
              {tab === t && (
                <span className={cn(
                  "absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full",
                  isWorker ? "bg-orange-600" : isAdmin ? "bg-purple-600" : "bg-teal-600"
                )} />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mr-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className={cn(
                "text-[11px] font-bold transition-colors cursor-pointer px-2 py-1 rounded-lg",
                isWorker
                  ? "text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                  : isAdmin
                  ? "text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                  : "text-teal-600 hover:text-teal-800 hover:bg-teal-50"
              )}
              title="Mark all notifications as read"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {tab === "all" && <AllNotifications onClose={onClose} />}
        {tab === "unread" && <UnreadNotifications onClose={onClose} />}
        {tab === "archived" && <ArchivedPanel />}
      </div>

      {tab === "all" && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <button
            onClick={() => {
              onClose()
              navigate("/notifications")
            }}
            className={cn(
              "w-full py-3.5 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2",
              isWorker
                ? "text-orange-700 hover:bg-orange-50/70 hover:text-orange-900"
                : isAdmin
                ? "text-purple-700 hover:bg-purple-50/70 hover:text-purple-900"
                : "text-teal-700 hover:bg-teal-50/70 hover:text-teal-900"
            )}
          >
            <span>View All Notifications</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}
    </div>
  )
}

function getIconForType(type?: string, role?: string) {
  const isWorker = isWorkerRole(role)
  const isAdmin = isAdminRole(role)
  const accentClass = isWorker ? "text-orange-600" : isAdmin ? "text-purple-600" : "text-teal-600"

  switch (type) {
    case "AiInspectionCompleted":
      return <Sparkles className={cn("h-4 w-4 shrink-0", accentClass)} />
    case "RatingSubmitted":
      return <CheckCircle2 className={cn("h-4 w-4 shrink-0", isWorker ? "text-orange-600" : "text-emerald-600")} />
    case "InvoiceIssued":
      return <Banknote className={cn("h-4 w-4 shrink-0", accentClass)} />
    case "TelemetryCheck":
      return <ShieldCheck className={cn("h-4 w-4 shrink-0", isWorker ? "text-orange-600" : "text-blue-600")} />
    case "NewAssignment":
      return <FileText className={cn("h-4 w-4 shrink-0", accentClass)} />
    default:
      return <MessageCircleDashed className={cn("h-4 w-4 shrink-0", isWorker ? "text-orange-500" : "text-gray-500")} />
  }
}

function getCategoryForType(type?: string) {
  switch (type) {
    case "AiInspectionCompleted":
      return "AI Inspection"
    case "RatingSubmitted":
      return "Reviews"
    case "InvoiceIssued":
      return "Finance"
    case "TelemetryCheck":
      return "Operations"
    case "NewAssignment":
      return "Operations"
    case "StatusUpdate":
      return "Operations"
    default:
      return "Operations"
  }
}

function AllNotifications({ onClose }: { onClose: () => void }) {
  const { notifications, handleNotificationClick, archiveNotification, deleteNotification, activeRole } = useNotification()
  const activeItems = notifications.filter((n) => !n.isArchived)
  const isWorker = isWorkerRole(activeRole)
  const isAdmin = isAdminRole(activeRole)

  if (activeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-gray-400">
        <MessageCircleDashed className="h-8 w-8 mb-2 opacity-50 text-gray-300" />
        <p className="text-xs font-medium text-gray-600">No active notifications</p>
        <p className="text-[11px] text-gray-400 mt-0.5">You're all caught up on facility alerts.</p>
      </div>
    )
  }

  return (
    <ol className="list-none m-0 p-0 divide-y divide-gray-100">
      {activeItems.map((item) => {
        const { woCode, clientName, workerName } = getNotificationDetails(item)
        return (
          <li
            key={item.id}
            className={cn(
              "group transition-colors cursor-pointer",
              !item.isRead
                ? isWorker
                  ? "hover:bg-orange-50/50 bg-orange-50/20"
                  : isAdmin
                  ? "hover:bg-purple-50/50 bg-purple-50/20"
                  : "hover:bg-teal-50/50 bg-teal-50/20"
                : "hover:bg-gray-50/80"
            )}
          >
            <div
              onClick={() => handleNotificationClick(item)}
              className="flex items-start px-5 py-3.5 relative"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-12">
                <span className={cn("text-[13px] font-semibold leading-snug", !item.isRead ? "text-gray-900 font-bold" : "text-gray-700")}>
                  {cleanFieldTeamText(item.title)}
                </span>
                {item.message && (
                  <span className="text-[12px] text-gray-500 line-clamp-2 mt-1">
                    {cleanFieldTeamText(item.message)}
                  </span>
                )}
                <span className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {item.timeAgo}
                  <span className="text-gray-300">&bull;</span>
                  <span className={cn(
                    "font-semibold",
                    isWorker ? "text-orange-600" : isAdmin ? "text-purple-600" : "text-teal-600"
                  )}>
                    {getCategoryForType(item.type)}
                  </span>
                </span>

                {(clientName || workerName || woCode) && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {clientName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                        Client: {clientName}
                      </span>
                    )}
                    {workerName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 font-medium">
                        Worker: {workerName}
                      </span>
                    )}
                    {woCode && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold",
                        isWorker
                          ? "bg-orange-50 text-orange-800 border border-orange-200"
                          : isAdmin
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-teal-50 text-teal-800 border border-teal-200"
                      )}>
                        {woCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!item.isRead && (
                <span className={cn(
                  "w-2 h-2 rounded-full absolute top-5 right-16",
                  isWorker ? "bg-orange-500" : isAdmin ? "bg-purple-500" : "bg-emerald-500"
                )} />
              )}
              <div className="flex items-center gap-1 absolute top-3.5 right-3 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    archiveNotification(item.id)
                  }}
                  className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                  title="Archive notification"
                >
                  <ArchiveIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(item.id)
                  }}
                  className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function UnreadNotifications({ onClose }: { onClose: () => void }) {
  const { notifications, handleNotificationClick, archiveNotification, deleteNotification, activeRole } = useNotification()
  const unreadItems = notifications.filter((n) => !n.isRead && !n.isArchived)
  const isWorker = isWorkerRole(activeRole)
  const isAdmin = isAdminRole(activeRole)

  if (unreadItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-gray-400">
        <CheckCircle2 className={cn(
          "h-8 w-8 mb-2",
          isWorker ? "text-orange-500/70" : isAdmin ? "text-purple-500/70" : "text-emerald-500/70"
        )} />
        <p className="text-xs font-semibold text-gray-700">All caught up!</p>
        <p className="text-[11px] text-gray-400 mt-0.5">There are no unread notifications right now.</p>
      </div>
    )
  }

  return (
    <ol className="list-none m-0 p-0 divide-y divide-gray-100">
      {unreadItems.map((item) => {
        const { woCode, clientName, workerName } = getNotificationDetails(item)
        return (
          <li
            key={item.id}
            className={cn(
              "group transition-colors cursor-pointer",
              isWorker ? "hover:bg-orange-50/40 bg-orange-50/10" : isAdmin ? "hover:bg-purple-50/40 bg-purple-50/10" : "hover:bg-emerald-50/40 bg-emerald-50/10"
            )}
          >
            <div
              onClick={() => handleNotificationClick(item)}
              className="flex items-start px-5 py-3.5 relative"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-12">
                <span className="text-[13px] font-bold text-gray-900 leading-snug">
                  {cleanFieldTeamText(item.title)}
                </span>
                {item.message && (
                  <span className="text-[12px] text-gray-500 line-clamp-2 mt-1">
                    {cleanFieldTeamText(item.message)}
                  </span>
                )}
                <span className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {item.timeAgo}
                  <span className="text-gray-300">&bull;</span>
                  <span className={cn(
                    "font-semibold",
                    isWorker ? "text-orange-600" : isAdmin ? "text-purple-600" : "text-teal-600"
                  )}>
                    {getCategoryForType(item.type)}
                  </span>
                </span>

                {(clientName || workerName || woCode) && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {clientName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                        Client: {clientName}
                      </span>
                    )}
                    {workerName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 font-medium">
                        Worker: {workerName}
                      </span>
                    )}
                    {woCode && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold",
                        isWorker
                          ? "bg-orange-50 text-orange-800 border border-orange-200"
                          : isAdmin
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-teal-50 text-teal-800 border border-teal-200"
                      )}>
                        {woCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 absolute top-3.5 right-3 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    archiveNotification(item.id)
                  }}
                  className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                  title="Archive notification"
                >
                  <ArchiveIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(item.id)
                  }}
                  className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function ArchivedPanel() {
  const { notifications, handleNotificationClick } = useNotification()
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterType, setFilterType] = React.useState<string | null>(null)

  const archivedItems = notifications.filter((n) => {
    if (!n.isArchived) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match = n.title.toLowerCase().includes(q) || (n.message && n.message.toLowerCase().includes(q))
      if (!match) return false
    }
    if (filterType) {
      if (filterType === "Author" && !n.author) return false
      if (filterType === "Type" && !n.type) return false
    }
    return true
  })

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex gap-2 p-3 items-center border-b border-gray-100 bg-gray-50/40">
        <input
          type="text"
          placeholder="Search archived..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-8 rounded-lg bg-white border border-gray-200 px-2.5 text-xs placeholder:text-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300 shadow-2xs"
        />
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 h-8 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
          >
            <PlusIcon className="h-3 w-3" />
            {filterType || "Filter"}
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-gray-200 bg-white shadow-xl z-20 py-1 font-sans">
                {[
                  { icon: UserIcon, label: "Author" },
                  { icon: CalendarIcon, label: "Date" },
                  { icon: TypeIcon, label: "Type" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setFilterType(filterType === label ? null : label)
                      setFilterOpen(false)
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 text-gray-500" /> {label}
                  </button>
                ))}
                {filterType && (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer border-t border-gray-100"
                    onClick={() => {
                      setFilterType(null)
                      setFilterOpen(false)
                    }}
                  >
                    <XIcon className="h-3.5 w-3.5" /> Clear Filter
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {archivedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center p-6 text-gray-400">
            <span className="bg-gray-100 rounded-full p-3 mb-2 text-gray-400">
              <ArchiveIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-gray-600">No archived notifications</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Archived items will appear here</span>
          </div>
        ) : (
          <ol className="list-none m-0 p-0 divide-y divide-gray-100">
            {archivedItems.map((item) => (
              <li
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className="p-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-800">{cleanFieldTeamText(item.title)}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{item.timeAgo}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default VercelNotificationPopover
