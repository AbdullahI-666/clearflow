"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  ArrowUp,
  Plus,
  FileText,
  Leaf,
  CheckCircle2,
  X,
  Image,
  Paperclip,
  BookOpen,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  ShieldAlert,
  ChevronRight,
  Info,
  Search,
  Star,
  ExternalLink,
  Flag,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/entities/user/hooks/useAuth";
import { toast } from "sonner";
import { apiClient } from "@/infrastructure/api/client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import { socketClient } from "@/infrastructure/socket/client";

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  file?: File;
}

export interface IdentifiedWorker {
  workerId: string;
  name: string;
  crew: string;
  phone: string;
  orderCode: string;
  orderTitle: string;
  category: string;
  rating?: number;
}

export const KNOWN_ORDER_WORKERS: Record<string, IdentifiedWorker> = {};

export const resolveWorkerFromQuery = (query: string): IdentifiedWorker | null => {
  const clean = query.trim().toUpperCase();
  if (!clean) return null;

  // Direct match on order code
  for (const [code, info] of Object.entries(KNOWN_ORDER_WORKERS)) {
    if (code.toUpperCase().includes(clean) || clean.includes(code.toUpperCase())) {
      return info;
    }
  }

  // Match on worker ID or digits (e.g. 6754, W#6754)
  for (const info of Object.values(KNOWN_ORDER_WORKERS)) {
    const rawDigits = info.workerId.replace(/\D/g, "");
    if (
      info.workerId.toUpperCase().includes(clean) ||
      (rawDigits && clean.includes(rawDigits)) ||
      clean.includes(info.workerId.toUpperCase())
    ) {
      return info;
    }
  }

  // Match on worker name
  for (const info of Object.values(KNOWN_ORDER_WORKERS)) {
    const parts = info.name.toUpperCase().split(" ");
    if (info.name.toUpperCase().includes(clean) || parts.some((p) => clean.includes(p))) {
      return info;
    }
  }

  // Match on crew name
  for (const info of Object.values(KNOWN_ORDER_WORKERS)) {
    if (info.crew.toUpperCase().includes(clean) || clean.includes(info.crew.toUpperCase())) {
      return info;
    }
  }

  return null;
};

export interface AIAssistantInterfaceProps {
  role?: string;
  companyPhone?: string;
}

export function AIAssistantInterface({ role, companyPhone }: AIAssistantInterfaceProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activePhone, setActivePhone] = useState<string>(companyPhone || '+92 42 35889104');

  useEffect(() => {
    if (companyPhone) {
      setActivePhone(companyPhone);
      return;
    }
    const fetchPhone = async () => {
      try {
        const res = await apiClient.get('/settings');
        if (res.data?.data?.companyPhone) {
          setActivePhone(res.data.data.companyPhone);
        }
      } catch (_) {}
    };
    fetchPhone();
    const handleUpdate = (e: any) => {
      if (e?.detail?.companyPhone) setActivePhone(e.detail.companyPhone);
    };
    window.addEventListener('clearflow:refresh-data', fetchPhone);
    window.addEventListener('clearflow:company-updated', handleUpdate);
    window.addEventListener('clearflow:settings-updated', handleUpdate);
    return () => {
      window.removeEventListener('clearflow:refresh-data', fetchPhone);
      window.removeEventListener('clearflow:company-updated', handleUpdate);
      window.removeEventListener('clearflow:settings-updated', handleUpdate);
    };
  }, [companyPhone]);

  // Role resolution (Worker / Field Team, Admin, Client)
  const rawRole = (role || user?.role || "").toLowerCase();
  const isWorker =
    rawRole === "fieldteam" ||
    rawRole === "field_team" ||
    rawRole === "field-team" ||
    rawRole === "field" ||
    rawRole === "worker";
  const isAdmin = rawRole === "admin";

  const theme = isWorker
    ? {
        glowBg: "bg-orange-500/35",
        pulseBorder: "border-orange-500/40",
        badgeGradient: "from-amber-500 to-orange-600",
        badgeShadow: "shadow-orange-500/35",
        headingColor: "text-amber-950",
        inputCardBorder: "border-gray-200 hover:border-amber-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15",
        uploadIcon: "text-amber-600",
        uploadHoverText: "hover:text-amber-950",
        micHoverText: "hover:text-amber-600 hover:bg-amber-50",
        sendActiveBg: "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/30",
        voiceWaveBg: "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-t border-amber-200/90",
        voiceWaveBars: ["bg-amber-500", "bg-orange-500", "bg-amber-600", "bg-orange-600"],
        voiceTitle: "text-amber-950",
        voicePing: "bg-amber-500",
        voiceSubtitle: "text-amber-700",
        voiceDoneBtn: "text-amber-900 bg-white hover:bg-amber-100 border-amber-300",
        attachmentTag: "bg-amber-50/90 hover:bg-amber-100/70 border-amber-200/80",
        attachmentThumbBorder: "border-amber-200",
        attachmentDocBg: "bg-amber-100",
        attachmentDocIcon: "text-amber-700",
        attachmentName: "text-amber-950",
        attachmentSize: "text-amber-600",
        attachmentRemove: "text-amber-400 hover:text-red-500 hover:bg-white",
        learnBorderHover: "hover:border-amber-400",
        learnIcon: "text-amber-600 group-hover:text-amber-700",
        learnTextHover: "group-hover:text-amber-950",
        modalHeaderGradient: "from-amber-50 to-orange-50",
        modalIconBox: "bg-amber-100 text-amber-800 border-amber-200",
        modalCardHover: "hover:border-amber-400 hover:bg-amber-50/30",
        modalCardIcon: "bg-amber-100/70 text-amber-600",
        modalCardTitle: "group-hover:text-amber-950",
        modalCardBtn: "text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200",
        complaintHelperText: "text-amber-600",
      }
    : isAdmin
    ? {
        glowBg: "bg-purple-600/35",
        pulseBorder: "border-purple-600/40",
        badgeGradient: "from-purple-600 to-indigo-600",
        badgeShadow: "shadow-purple-600/35",
        headingColor: "text-purple-950",
        inputCardBorder: "border-gray-200 hover:border-purple-300 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/15",
        uploadIcon: "text-purple-600",
        uploadHoverText: "hover:text-purple-950",
        micHoverText: "hover:text-purple-600 hover:bg-purple-50",
        sendActiveBg: "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/30",
        voiceWaveBg: "bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-t border-purple-200/90",
        voiceWaveBars: ["bg-purple-500", "bg-indigo-500", "bg-purple-600", "bg-indigo-600"],
        voiceTitle: "text-purple-950",
        voicePing: "bg-purple-500",
        voiceSubtitle: "text-purple-700",
        voiceDoneBtn: "text-purple-900 bg-white hover:bg-purple-100 border-purple-300",
        attachmentTag: "bg-purple-50/90 hover:bg-purple-100/70 border-purple-200/80",
        attachmentThumbBorder: "border-purple-200",
        attachmentDocBg: "bg-purple-100",
        attachmentDocIcon: "text-purple-700",
        attachmentName: "text-purple-950",
        attachmentSize: "text-purple-600",
        attachmentRemove: "text-purple-400 hover:text-red-500 hover:bg-white",
        learnBorderHover: "hover:border-purple-400",
        learnIcon: "text-purple-600 group-hover:text-purple-700",
        learnTextHover: "group-hover:text-purple-950",
        modalHeaderGradient: "from-purple-50 to-indigo-50",
        modalIconBox: "bg-purple-100 text-purple-800 border-purple-200",
        modalCardHover: "hover:border-purple-400 hover:bg-purple-50/30",
        modalCardIcon: "bg-purple-100/70 text-purple-600",
        modalCardTitle: "group-hover:text-purple-950",
        modalCardBtn: "text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200",
        complaintHelperText: "text-purple-600",
      }
    : {
        glowBg: "bg-[#09B599]/30",
        pulseBorder: "border-[#09B599]/40",
        badgeGradient: "from-[#09B599] to-[#00A487]",
        badgeShadow: "shadow-[#09B599]/35",
        headingColor: "text-[#006955]",
        inputCardBorder: "border-gray-200 hover:border-teal-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/15",
        uploadIcon: "text-[#09B599]",
        uploadHoverText: "hover:text-[#006955]",
        micHoverText: "hover:text-[#09B599] hover:bg-teal-50",
        sendActiveBg: "bg-[#09B599] text-white hover:bg-[#00A487] shadow-md shadow-[#09B599]/30",
        voiceWaveBg: "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-t border-teal-200/90",
        voiceWaveBars: ["bg-[#09B599]", "bg-[#00A487]", "bg-[#09B599]", "bg-[#006955]"],
        voiceTitle: "text-teal-950",
        voicePing: "bg-emerald-500",
        voiceSubtitle: "text-teal-700",
        voiceDoneBtn: "text-emerald-800 bg-white hover:bg-emerald-100 border-teal-300",
        attachmentTag: "bg-teal-50/90 hover:bg-teal-100/70 border-teal-200/80",
        attachmentThumbBorder: "border-teal-200",
        attachmentDocBg: "bg-teal-100",
        attachmentDocIcon: "text-teal-700",
        attachmentName: "text-teal-950",
        attachmentSize: "text-teal-600",
        attachmentRemove: "text-teal-400 hover:text-red-500 hover:bg-white",
        learnBorderHover: "hover:border-[#09B599]",
        learnIcon: "text-[#09B599] group-hover:text-[#008f75]",
        learnTextHover: "group-hover:text-[#006955]",
        modalHeaderGradient: "from-teal-50 to-emerald-50",
        modalIconBox: "bg-teal-100 text-[#006955] border-teal-200",
        modalCardHover: "hover:border-teal-400 hover:bg-teal-50/30",
        modalCardIcon: "bg-teal-100/70 text-[#09B599]",
        modalCardTitle: "group-hover:text-[#006955]",
        modalCardBtn: "text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200",
        complaintHelperText: "text-teal-600",
      };

  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick Action Modals (Learn and Complain)
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [isComplainModalOpen, setIsComplainModalOpen] = useState(false);

  // Complaint Form State
  const [complaintQueryId, setComplaintQueryId] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("Service Delay & Equipment");
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [complaintSeverity, setComplaintSeverity] = useState<"Low" | "Medium" | "Elevated" | "Urgent">("Elevated");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  // Automatically identified worker
  const identifiedWorker = resolveWorkerFromQuery(complaintQueryId) || (complaintQueryId.toLowerCase().includes("ahsan") ? KNOWN_ORDER_WORKERS["WO-2026-0001"] : complaintQueryId.toLowerCase().includes("hamza") ? KNOWN_ORDER_WORKERS["WO-2026-0004"] : null);

  const handleSubmitComplaint = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!complaintQueryId.trim()) {
      toast.error("Please select or enter the worker name.");
      return;
    }
    if (!complaintTitle.trim() || !complaintDesc.trim()) {
      toast.error("Please enter a complaint headline and detailed description.");
      return;
    }

    const worker = identifiedWorker || {
      name: complaintQueryId.trim(),
      crew: "Facility Services",
      workerId: "W#ASSGN",
      orderCode: "WO-2026-0006",
      orderTitle: "Facility Operations",
    };

    setIsSubmittingComplaint(true);

    const clientName = user?.name || "Client";
    const clientId = user?._id || "65f000000000000000000002";
    const clientEmail = user?.email || "client@clearflow.com";
    const newCmpCode = `CMP-2026-00${Math.floor(Math.random() * 80) + 10}`;

    const newComplaintRecord = {
      _id: "cmp_" + Date.now(),
      complaintCode: newCmpCode,
      workOrderId: worker.orderCode,
      workOrderTitle: worker.orderTitle,
      title: complaintTitle.trim(),
      category: complaintCategory,
      description: complaintDesc.trim(),
      severity: complaintSeverity,
      status: "Open" as const,
      filedBy: {
        _id: clientId,
        name: `${clientName} (Client)`,
        email: clientEmail,
        role: "Client" as const,
      },
      targetParty: `${worker.crew} (${worker.name})`,
      createdAt: new Date().toISOString(),
      messages: [
        {
          _id: "cmp_msg_" + Date.now(),
          senderId: { _id: clientId, name: `${clientName} (Client)` },
          senderRole: "Client",
          message: complaintDesc.trim(),
          sentAt: new Date().toISOString(),
        },
        {
          _id: "cmp_msg_adm_" + (Date.now() + 100),
          senderId: { _id: "65f000000000000000000001", name: "Abdullah (Admin Supervisor)" },
          senderRole: "Admin",
          message: `Admin supervisor Abdullah acknowledged Complaint ${newCmpCode} regarding worker ${worker.name}. Dispute investigation logged in operations desk.`,
          sentAt: new Date(Date.now() + 100).toISOString(),
        },
      ],
    };

    // 1. Sync to clearflow_complaints in localStorage
    try {
      const stored = localStorage.getItem("clearflow_complaints");
      const list = stored ? JSON.parse(stored) : [];
      const updated = [newComplaintRecord, ...list];
      localStorage.setItem("clearflow_complaints", JSON.stringify(updated));
    } catch (err) {}

    // 2. Dispatch custom event for real-time sync with ChatWindow
    window.dispatchEvent(
      new CustomEvent("clearflow:new-complaint", {
        detail: { complaint: newComplaintRecord },
      })
    );

    // 3. Insert official complaint statement into channel chat history
    const complaintNoticeMsg = {
      _id: "msg_cmp_" + Date.now(),
      senderId: {
        _id: clientId,
        name: `${clientName} (Client)`,
        email: clientEmail,
      },
      senderRole: "Client",
      message: `🚨 [OFFICIAL COMPLAINT FILED - ${newCmpCode}]\nAssigned Worker: ${worker.name} (${worker.workerId})\nCrew: ${worker.crew}\nCategory: ${complaintCategory}\nHeadline: ${complaintTitle.trim()}\nIssue: ${complaintDesc.trim()}`,
      sentAt: new Date().toISOString(),
    };

    const adminAckMsg = {
      _id: "msg_adm_ack_" + Date.now(),
      senderId: {
        _id: "65f000000000000000000001",
        name: "Abdullah (Admin Supervisor)",
      },
      senderRole: "Admin",
      message: `⚠️ Admin supervisor Abdullah received Complaint ${newCmpCode} against worker ${worker.name} (${worker.workerId}). An investigation has been initiated in the Complaints desk.`,
      sentAt: new Date(Date.now() + 500).toISOString(),
    };

    try {
      const storedChat = localStorage.getItem("clearflow_order_chat_history");
      const chatHist = storedChat ? JSON.parse(storedChat) : {};
      const channelMsgs = chatHist[worker.orderCode] || [];
      chatHist[worker.orderCode] = [...channelMsgs, complaintNoticeMsg, adminAckMsg];
      if (worker.orderCode !== "WO-2026-0006") {
        const defMsgs = chatHist["WO-2026-0006"] || [];
        chatHist["WO-2026-0006"] = [...defMsgs, complaintNoticeMsg, adminAckMsg];
      }
      localStorage.setItem("clearflow_order_chat_history", JSON.stringify(chatHist));
    } catch (err) {}

    window.dispatchEvent(
      new CustomEvent("clearflow:chat-message", {
        detail: {
          channelCode: worker.orderCode,
          message: complaintNoticeMsg,
        },
      })
    );

    try {
      apiClient.post(ENDPOINTS.CHAT.COMPLAINTS, {
        title: complaintTitle.trim(),
        category: complaintCategory,
        workOrderId: worker.orderCode,
        workOrderTitle: worker.orderTitle,
        severity: complaintSeverity,
        description: complaintDesc.trim(),
        targetParty: `${worker.crew} (${worker.name})`,
      }).catch(() => {});
    } catch (e) {}

    setIsSubmittingComplaint(false);
    setIsComplainModalOpen(false);
    setComplaintTitle("");
    setComplaintDesc("");

    toast.success(`Complaint ${newCmpCode} filed against ${worker.name}!`, {
      description: "Directly notified Admin Supervisor in Chat Complaints.",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      action: {
        label: "Open in Chat",
        onClick: () => navigate("/chat"),
      },
    });
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    fileList.forEach((file) => {
      const isImg = file.type.startsWith("image/");
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      if (isImg) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            {
              id,
              name: file.name,
              size: file.size,
              type: file.type,
              previewUrl: reader.result as string,
              file,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
          },
        ]);
      }
    });

    toast.success(`Attached ${fileList.length} item(s) from gallery/files`);
    e.target.value = "";
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setInterimSpeech("");
      toast.info("Voice dictation stopped");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // High accuracy continuous listening & live streaming interim results
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = navigator.language || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.success("Microphone active! Speak naturally...", {
          description: "Your voice will appear live on screen.",
        });
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            interimChunk += item[0].transcript;
          }
        }

        if (finalChunk) {
          setInputValue((prev) => {
            const base = prev.trim();
            return base ? `${base} ${finalChunk.trim()}` : finalChunk.trim();
          });
          setInterimSpeech("");
        } else if (interimChunk) {
          setInterimSpeech(interimChunk);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "no-speech") {
          return;
        }
        if (event.error === "not-allowed") {
          toast.error("Microphone permission denied. Please allow microphone in browser settings.");
        } else if (event.error === "network") {
          toast.error("Network issue with speech recognition service.");
        } else {
          toast.error(`Microphone error: ${event.error || "recognition failed"}`);
        }
        setIsListening(false);
        setInterimSpeech("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimSpeech("");
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      setInterimSpeech("");
      toast.error("Microphone access failed. Please check permissions.");
    }
  };

  const handleSendMessage = () => {
    const hasText = inputValue.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if (!hasText && !hasAttachments) return;

    const messageText = hasText
      ? inputValue.trim()
      : `Sent ${attachments.length} attachment(s): ${attachments.map((a) => a.name).join(", ")}`;
    const clientName = user?.name || "Client";
    const clientId = user?.id || (user as any)?._id || (user as any)?.userId || '';
    const targetChannelCode = clientId ? `direct_${clientId}` : "direct_admin";
    const targetChatApiId = clientId || targetChannelCode;

    const currentAttachments = [...attachments];
    setInputValue("");
    setAttachments([]);

    // Format complete payload matching ClearFlow Chat architecture
    const fullMessagePayload = {
      _id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      workOrderId: targetChatApiId,
      channelId: targetChannelCode,
      senderId: {
        _id: clientId,
        name: clientName,
        email: user?.email || "",
        role: "Client",
      },
      senderRole: "Client",
      message: messageText,
      attachments: currentAttachments.map((a) => ({
        name: a.name,
        size: a.size,
        type: a.type,
        previewUrl: a.previewUrl,
      })),
      sentAt: new Date().toISOString(),
    };

    // 1. Persist message into browser chat history so it appears in Chat
    try {
      const stored = localStorage.getItem('clearflow_order_chat_history');
      const history = stored ? JSON.parse(stored) : {};
      const channelMsgs = history[targetChannelCode] || history[targetChatApiId] || [];
      const updatedMsgs = [...channelMsgs, fullMessagePayload];
      history[targetChannelCode] = updatedMsgs;
      if (clientId) history[clientId] = updatedMsgs;
      localStorage.setItem('clearflow_order_chat_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }

    // 2. Dispatch global window custom event for real-time sync with Admin Chat
    window.dispatchEvent(
      new CustomEvent("clearflow:chat-message", {
        detail: {
          channelCode: targetChannelCode,
          workOrderId: targetChatApiId,
          message: fullMessagePayload,
        },
      })
    );
    window.dispatchEvent(new CustomEvent("clearflow:refresh-data"));

    // 3. Send via server API & WebSocket for real-time socket propagation to Admin
    try {
      apiClient.post(ENDPOINTS.CHAT.MESSAGES(encodeURIComponent(targetChatApiId)), {
        message: messageText,
        channelId: targetChannelCode,
      }).catch((err) => {
        console.warn("Failed to deliver message to admin API:", err);
      });
    } catch (e) {}

    try {
      socketClient.connect();
      const socket = socketClient.getSocket();
      if (socket) {
        socket.emit("chat:message", fullMessagePayload);
      }
    } catch (e) {}

    // Toast notification: clean confirmation without "Open Chat" action button
    toast.success("Message sent to Admin Operations!", {
      description: "Admin will review and reply in your Chat tab.",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 sm:py-10">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        
        {/* ============================================================== */}
        {/* 100% AUTHENTIC CLEARFLOW LEAF LOGO & SIGNATURE LEAF-GREEN ANIMATION */}
        {/* ============================================================== */}
        <div className="mb-4 relative flex items-center justify-center select-none">
          {/* Ambient Pulsing Glow */}
          <motion.div
            animate={{
              scale: [1, 1.22, 1],
              opacity: [0.35, 0.65, 0.35],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute w-24 h-24 rounded-full ${theme.glowBg} blur-xl pointer-events-none`}
          />

          {/* Radiating Ripple Ring */}
          <motion.div
            animate={{
              scale: [1, 1.35, 1.55],
              opacity: [0.55, 0.2, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className={`absolute w-18 h-18 rounded-[24px] border-2 ${theme.pulseBorder} pointer-events-none`}
          />

          {/* Official ClearFlow Squircle Leaf Badge */}
          <motion.div
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-[20px] bg-gradient-to-br ${theme.badgeGradient} flex items-center justify-center shadow-lg ${theme.badgeShadow} border border-white/40 z-10`}
          >
            {/* Top specular glass sheen */}
            <div className="absolute inset-0 rounded-[20px] bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />

            {/* Official ClearFlow White Leaf */}
            <Leaf
              className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-sm"
              strokeWidth={2.4}
            />
          </motion.div>
        </div>

        {/* ============================================================== */}
        {/* HEADING: ONLY "Ready to assist you" AS REQUESTED */}
        {/* ============================================================== */}
        <div className="mb-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-2xl sm:text-3xl font-extrabold ${theme.headingColor} tracking-tight`}
          >
            Ready to assist you
          </motion.h1>
        </div>

        {/* ============================================================== */}
        {/* INPUT AREA */}
        {/* ============================================================== */}
        <div className={`w-full bg-white border ${theme.inputCardBorder} rounded-xl shadow-xs overflow-hidden mb-4 transition-all`}>
          <div className="p-4">
            <input
              ref={inputRef}
              type="text"
              placeholder={
                isListening
                  ? "Listening to your voice live... speak now"
                  : "Ask me anything or message Admin directly..."
              }
              value={interimSpeech ? (inputValue ? `${inputValue} ${interimSpeech}` : interimSpeech) : inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full text-gray-800 text-base outline-none placeholder:text-gray-400 bg-transparent"
            />
          </div>

          {/* Live Audio Listening Wave Bar */}
          {isListening && (
            <div className={`px-4 py-2.5 ${theme.voiceWaveBg} flex items-center justify-between animate-in fade-in`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-3 ${theme.voiceWaveBars[0]} rounded-full animate-bounce [animation-delay:-0.3s]`} />
                  <span className={`w-1.5 h-5 ${theme.voiceWaveBars[1]} rounded-full animate-bounce [animation-delay:-0.15s]`} />
                  <span className={`w-1.5 h-3.5 ${theme.voiceWaveBars[2]} rounded-full animate-bounce`} />
                  <span className={`w-1.5 h-2 ${theme.voiceWaveBars[3]} rounded-full animate-bounce [animation-delay:-0.2s]`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${theme.voiceTitle} flex items-center gap-1.5`}>
                    <span className={`w-2 h-2 rounded-full ${theme.voicePing} animate-ping`} />
                    Microphone is listening 100% live...
                  </span>
                  <span className={`text-[11px] ${theme.voiceSubtitle} font-medium italic truncate max-w-sm sm:max-w-md`}>
                    {interimSpeech ? `"${interimSpeech}"` : "Speak clearly into your microphone..."}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer shadow-2xs transition-colors ${theme.voiceDoneBtn}`}
              >
                Done Speaking
              </button>
            </div>
          )}

          {/* Uploaded attachments preview (Images with thumbnails from gallery, documents with icons) */}
          {attachments.length > 0 && (
            <div className="px-4 pb-3 pt-1 border-t border-gray-100/80">
              <div className="flex flex-wrap gap-2 items-center">
                {attachments.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative flex items-center gap-2 ${theme.attachmentTag} py-1.5 px-2.5 rounded-lg text-xs transition-all shadow-2xs`}
                  >
                    {item.previewUrl ? (
                      <div
                        onClick={() => setSelectedPreviewImage(item.previewUrl || null)}
                        className={`relative w-8 h-8 rounded-md overflow-hidden bg-gray-100 shrink-0 border ${theme.attachmentThumbBorder} cursor-pointer hover:opacity-90 transition-opacity`}
                        title="Click to view image"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-md ${theme.attachmentDocBg} flex items-center justify-center shrink-0`}>
                        <FileText className={`w-4 h-4 ${theme.attachmentDocIcon}`} />
                      </div>
                    )}

                    <div className="flex flex-col min-w-0 max-w-[170px]">
                      <span className={`${theme.attachmentName} font-semibold truncate text-[11px] leading-tight`}>
                        {item.name}
                      </span>
                      <span className={`${theme.attachmentSize} text-[10px]`}>
                        {(item.size / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((a) => a.id !== item.id)
                        )
                      }
                      className={`${theme.attachmentRemove} rounded-full p-1 transition-colors cursor-pointer ml-1`}
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Toolbar: Upload Files (with Photo Gallery & Document options), Enter hint, Mic, and Send */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
            {/* Hidden native input for browsing all files and images */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            {/* Direct Upload Files button - no dropdown */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 text-gray-700 text-xs font-semibold ${theme.uploadHoverText} transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-gray-100/70`}
            >
              <Plus className={`w-3.5 h-3.5 ${theme.uploadIcon}`} strokeWidth={2.5} />
              <span>Upload Files</span>
            </button>

            {/* Right: Enter hint (without ↵), Mic, and Send */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400 font-medium">Press Enter to send</span>

              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`relative p-2 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-4 ring-rose-200 animate-pulse scale-105"
                    : `text-gray-500 ${theme.micHoverText}`
                }`}
                title={isListening ? "Stop Voice Dictation" : "Start Voice Dictation"}
              >
                {isListening ? (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-white animate-ping" />
                  </>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() && attachments.length === 0}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                  inputValue.trim() || attachments.length > 0
                    ? `${theme.sendActiveBg} scale-100 active:scale-95`
                    : "bg-gray-100 text-gray-400 cursor-not-allowed scale-95"
                }`}
                title="Send directly to Admin"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* QUICK ACTION CARDS: ONLY LEARN AND COMPLAIN */}
        {/* ============================================================== */}
        <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 mt-2 mb-6">
          {/* 1. LEARN CARD */}
          <button
            type="button"
            onClick={() => setIsLearnModalOpen(true)}
            className={`flex flex-col items-center justify-center p-4 sm:p-5 bg-white border border-gray-200/90 rounded-2xl shadow-2xs hover:shadow-md ${theme.learnBorderHover} transition-all cursor-pointer group`}
          >
            <BookOpen className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.learnIcon} transition-colors mb-2`} strokeWidth={1.8} />
            <span className={`text-xs sm:text-sm font-semibold text-gray-700 ${theme.learnTextHover} transition-colors`}>
              Learn
            </span>
          </button>

          {/* 2. COMPLAIN CARD */}
          <button
            type="button"
            onClick={() => setIsComplainModalOpen(true)}
            className="flex flex-col items-center justify-center p-4 sm:p-5 bg-white border border-gray-200/90 rounded-2xl shadow-2xs hover:shadow-md hover:border-rose-400 transition-all cursor-pointer group"
          >
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 group-hover:text-rose-600 transition-colors mb-2" strokeWidth={1.8} />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-rose-700 transition-colors">
              Complain
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* 24/7 OPERATIONS SUPPORT: CENTERED DOWN TO LEARN AND COMPLAIN  */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center justify-center text-center mt-1 mb-6 select-none">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>24/7 Operations Support:</span>
          </div>
          <a
            href={`tel:${activePhone.replace(/\s+/g, '')}`}
            className="text-sm sm:text-base font-bold text-gray-900 hover:text-teal-700 transition-colors font-mono tracking-wide mt-0.5 hover:underline"
          >
            {activePhone}
          </a>
        </div>

        {/* Gallery Image Lightbox Modal */}
        {selectedPreviewImage && (
          <div
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setSelectedPreviewImage(null)}
          >
            <div
              className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={selectedPreviewImage}
                alt="Gallery preview"
                className="max-h-[78vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* COMPLAINT MODAL: Tell ID -> Auto-resolves & assigns worker -> sends to Admin Chat */}
        {isComplainModalOpen && (
          <div
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
            onClick={() => setIsComplainModalOpen(false)}
          >
            <div
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-purple-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center border border-rose-200/80 shadow-2xs">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                      File Official Complaint
                    </h2>
                    <p className="text-xs text-gray-500">
                      Dispute ticket sent directly to Admin Supervisor & worker
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComplainModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitComplaint} className="p-6 space-y-4 overflow-y-auto">
                {/* 1. Enter Worker Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Worker Name
                    </label>
                    <span className={`text-[11px] ${theme.complaintHelperText} font-medium`}>
                      Select worker assigned to your service
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={complaintQueryId}
                      onChange={(e) => setComplaintQueryId(e.target.value)}
                      placeholder="e.g. Worker or Ticket ID..."
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 outline-none transition-all shadow-2xs"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  </div>

                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Issue Category
                    </label>
                    <select
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium bg-white text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 outline-none cursor-pointer"
                    >
                      <option value="Service Delay & Equipment">Service Delay & Missing Equipment</option>
                      <option value="Poor Workmanship">Poor Workmanship / Incomplete Job</option>
                      <option value="Safety Hazard & Code Violation">Safety Hazard & Code Violation</option>
                      <option value="Unprofessional Conduct">Unprofessional Conduct</option>
                      <option value="Access & Security Dispute">Access Refused / Security Dispute</option>
                      <option value="Billing & Pricing Dispute">Billing or Scope Dispute</option>
                      <option value="Other Operational Dispute">Other Operational Dispute</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Severity Level
                    </label>
                    <select
                      value={complaintSeverity}
                      onChange={(e) => setComplaintSeverity(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium bg-white text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 outline-none cursor-pointer"
                    >
                      <option value="Low">Low - Minor Observation</option>
                      <option value="Medium">Medium - Standard Resolution</option>
                      <option value="Elevated">Elevated Priority</option>
                      <option value="Urgent">Urgent - Immediate Safety Hazard</option>
                    </select>
                  </div>
                </div>

                {/* 3. Headline */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Complaint Headline
                  </label>
                  <input
                    type="text"
                    value={complaintTitle}
                    onChange={(e) => setComplaintTitle(e.target.value)}
                    placeholder="e.g. Worker arrived 45 minutes late without vacuum equipment"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 outline-none shadow-2xs"
                    required
                  />
                </div>

                {/* 4. Description */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Detailed Explanation of the Issue
                  </label>
                  <textarea
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder="Provide specific details about what occurred, room location, and requested resolution..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 outline-none resize-none shadow-2xs"
                    required
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsComplainModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingComplaint || !complaintTitle.trim() || !complaintDesc.trim()}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Submit Complaint to Admin</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LEARN MODAL: ClearFlow Knowledge Base, Facility Standards & FAQs */}
        {isLearnModalOpen && (
          <div
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
            onClick={() => setIsLearnModalOpen(false)}
          >
            <div
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r ${theme.modalHeaderGradient}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${theme.modalIconBox} flex items-center justify-center shadow-2xs`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                      ClearFlow Knowledge & Standards
                    </h2>
                    <p className="text-xs text-gray-500">
                      Standard operating procedures, cleaning protocols & FAQs
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLearnModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Topics List */}
              <div className="p-6 space-y-3.5 overflow-y-auto">
                {[
                  {
                    title: "Facility Cleaning & Sanitization Standards",
                    icon: ShieldAlert,
                    desc: "Hospital-grade HEPA extraction, hospital disinfectant spray, and post-service ATP swab audit.",
                    query: "What are the standard cleaning and chemical safety procedures used by ClearFlow?",
                  },
                  {
                    title: "Service Level Agreement (SLA) & Response Times",
                    icon: Clock,
                    desc: "Urgent safety dispatches arrive within 15 minutes; standard cleaning requests are scheduled within 2 hours.",
                    query: "How fast do technicians respond to urgent facility requests?",
                  },
                  {
                    title: "Auto-Debit, PKR Invoices & Bank Transfers",
                    icon: FileText,
                    desc: "Instant digital receipt generation with downloadable PDF for audit compliance and auto-debit notes.",
                    query: "How does invoice posting and payment receipt settlement work in ClearFlow?",
                  },
                  {
                    title: "Worker Credentials, CNIC & Safety Screening",
                    icon: User,
                    desc: "100% verified technicians with national CNIC verification and background safety certificates.",
                    query: "How are ClearFlow facility technicians vetted and assigned?",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border border-gray-200/90 ${theme.modalCardHover} bg-white transition-all flex items-start justify-between gap-4 group`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${theme.modalCardIcon} flex items-center justify-center shrink-0 mt-0.5`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold text-gray-800 ${theme.modalCardTitle} transition-colors`}>
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInputValue(item.query);
                        setIsLearnModalOpen(false);
                      }}
                      className={`shrink-0 text-xs font-semibold ${theme.modalCardBtn} px-3 py-1.5 rounded-lg cursor-pointer transition-colors`}
                    >
                      Ask Assistant
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="w-full">
      <AIAssistantInterface />
    </div>
  );
}

export default AIAssistantInterface;
