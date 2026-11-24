import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, MapPin, User, MessageCircle, Star, Download, ShieldCheck, 
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Navigation, 
  Clock, ShieldAlert, ArrowRightLeft, Banknote, X, Check, XCircle,
  Camera, UploadCloud, Sparkles, ThumbsUp, AlertTriangle,
  Wrench, UserCheck, Gift, Coins, Award, Trash2, Send
} from 'lucide-react';
import { usePermissions } from '@/entities/user/hooks/usePermissions';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { IdentityVerificationModal } from '@/shared/components/IdentityVerificationModal';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { WorkOrder } from '@/entities/workOrder/types';
import type { FieldTeam } from '@/entities/team/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { createClearFlowPinIcon } from '@/shared/components/maps/clearflowMapPin';
import { socketClient } from '@/infrastructure/socket/client';
import { CategorySquircleLogo, getCategory3DIcon } from '@/shared/utils/categoryIcons';
import { downloadWorkOrderReport } from '@/shared/utils/pdfDownloader';

const sitePinIcon = createClearFlowPinIcon('Service Site');

const WORK_ORDER_CLIENTS: Record<string, { name: string; id: string; gender: 'boy' | 'girl' }> = {};
const TEAM_WORKER_IDS: Record<string, string> = {};
const TEAM_WORKER_NAMES: Record<string, string> = {};

const getWorkerNameForTeam = (tName: string) => {
  if (!tName || tName === 'Unassigned') return '';
  return TEAM_WORKER_NAMES[tName] || '';
};

// Client-side image compression helper for responsive, fast gallery & camera uploads
const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isClient, isAdmin, isFieldTeam } = usePermissions();
  const theme = useRoleTheme();
  const { user } = useAuth();
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const isWorkerVerified = Boolean(
    (user?.cnicVerified === true || user?.verificationStatus === 'Verified') &&
    user?.cnic &&
    user.cnic.replace(/\D/g, '').length === 13
  );

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3 Before & 3 After file input refs
  const beforeFileInputRef0 = useRef<HTMLInputElement>(null);
  const beforeFileInputRef1 = useRef<HTMLInputElement>(null);
  const beforeFileInputRef2 = useRef<HTMLInputElement>(null);
  const beforeFileInputRefs = [beforeFileInputRef0, beforeFileInputRef1, beforeFileInputRef2];

  const afterFileInputRef0 = useRef<HTMLInputElement>(null);
  const afterFileInputRef1 = useRef<HTMLInputElement>(null);
  const afterFileInputRef2 = useRef<HTMLInputElement>(null);
  const afterFileInputRefs = [afterFileInputRef0, afterFileInputRef1, afterFileInputRef2];

  // Genuine Before Photos (Client) & After Photos (Field Team) - No demo samples
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [isUploadingBeforeIndex, setIsUploadingBeforeIndex] = useState<number | null>(null);
  const [isUploadingAfterIndex, setIsUploadingAfterIndex] = useState<number | null>(null);

  // Stage 1 & 2 Completion State
  const [isSubmittingWorkerCompletion, setIsSubmittingWorkerCompletion] = useState(false);
  const [workerCompletionNotes, setWorkerCompletionNotes] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [behaviorRating, setBehaviorRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [overallRating, setOverallRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [actualPaidAmount, setActualPaidAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'JazzCash' | 'EasyPaisa'>('Cash');
  const [isSubmittingConfirmation, setIsSubmittingConfirmation] = useState(false);

  // Client Photo Feedback
  const [clientFeedbackRating, setClientFeedbackRating] = useState(5);
  const [clientFeedbackSatisfaction, setClientFeedbackSatisfaction] = useState<'Approved' | 'ChangesRequested'>('Approved');
  const [clientFeedbackComment, setClientFeedbackComment] = useState('');
  const [isSubmittingClientFeedback, setIsSubmittingClientFeedback] = useState(false);

  // Admin AI Quality Inspection Hub
  const [isAdminInspecting, setIsAdminInspecting] = useState(false);
  const [adminDecision, setAdminDecision] = useState<'Passed' | 'Flagged' | 'Pending'>('Passed');
  const [adminNotes, setAdminNotes] = useState('');

  // Admin Override Modal
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<FieldTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [overrideReason, setOverrideReason] = useState('Proximity and specialized equipment requirement');
  const [isOverriding, setIsOverriding] = useState(false);

  // Admin Invoice Modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState<number | ''>(120);
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [isIssuingInvoice, setIsIssuingInvoice] = useState(false);

  // Admin Give Bonus State
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(50);
  const [bonusReason, setBonusReason] = useState('Quality & speed excellence bonus for bidding');
  const [bonusCash, setBonusCash] = useState<number | ''>(0);
  const [isGivingBonus, setIsGivingBonus] = useState(false);
  const [bonusAwardedPoints, setBonusAwardedPoints] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`cf_admin_bonus_${id}`);
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  });

  // Accept / Reject state
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [hasOtherActiveJob, setHasOtherActiveJob] = useState(false);

  // Worker Counter-Bid / Quotation State
  const [isCounterBidOpen, setIsCounterBidOpen] = useState(false);
  const [counterBidPrice, setCounterBidPrice] = useState<number | ''>('');
  const [counterBidEta, setCounterBidEta] = useState<number | ''>(20);
  const [counterBidMessage, setCounterBidMessage] = useState('');
  const [isSubmittingCounterBid, setIsSubmittingCounterBid] = useState(false);
  const [isAcceptingCounterOffer, setIsAcceptingCounterOffer] = useState(false);

  const handleCounterBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !workOrder) return;
    if (!counterBidPrice || Number(counterBidPrice) <= 0) {
      toast.error('Please enter a valid quotation amount in PKR.');
      return;
    }
    setIsSubmittingCounterBid(true);
    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.SUBMIT_OFFER(workOrder._id || id), {
        offerPrice: Number(counterBidPrice),
        proposedEtaMinutes: Number(counterBidEta) || 20,
        distanceKm: Number((workOrder as any).distanceKm || 3.0),
        message: counterBidMessage.trim() || `Specialist custom quotation for ${workOrder.title}. Reviewed job requirements and photos.`,
      });
      if (res.data?.success) {
        toast.success(`🎉 Quotation of PKR ${counterBidPrice} submitted to client!`);
        setIsCounterBidOpen(false);
        setWorkOrder((prev: any) => prev ? { ...prev, agreedPrice: Number(counterBidPrice), quotationPrice: Number(counterBidPrice) } : prev);
        await fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit quotation');
    } finally {
      setIsSubmittingCounterBid(false);
    }
  };

  const handleClientAcceptCounterQuote = async (offerPrice: number) => {
    if (!id) return;
    setIsAcceptingCounterOffer(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(id), {
        status: 'Assigned',
        agreedPrice: offerPrice,
      });
      if (res.data?.success) {
        toast.success(`Specialist quotation of PKR ${offerPrice} accepted! Specialist dispatched.`);
        await fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept quotation');
    } finally {
      setIsAcceptingCounterOffer(false);
    }
  };

  useEffect(() => {
    if (isFieldTeam) {
      apiClient.get(ENDPOINTS.WORK_ORDERS.BASE).then((res) => {
        if (res.data?.success && res.data?.data) {
          const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
          const hasInProgress = list.some(
            (w: any) => w.status === 'InProgress' && (w._id !== id && w.workOrderCode !== id)
          );
          setHasOtherActiveJob(hasInProgress);
        }
      }).catch(() => {});
    }
  }, [isFieldTeam, id]);

  const handleAcceptOrder = async () => {
    if (!id) return;
    if (isFieldTeam && !isWorkerVerified) {
      setIsVerificationModalOpen(true);
      return;
    }
    if (hasOtherActiveJob) {
      toast.error('You cannot accept new requests while you have a task in progress. Complete your active job first.');
      return;
    }
    setIsAccepting(true);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.ACCEPT(id));
      if (res.data?.success) {
        toast.success('Service request accepted! Notification sent to client.');
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!id) return;
    setIsRejecting(true);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.REJECT(id), { reason: rejectReason.trim() });
      if (res.data?.success) {
        toast.success('Request declined. Notification sent to client.');
        setIsRejectModalOpen(false);
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to decline request');
    } finally {
      setIsRejecting(false);
    }
  };

  // Cancel Order Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Service no longer required / Schedule conflict');
  const [isCancelling, setIsCancelling] = useState(false);

  // Client Done State
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  // Worker Arrival State
  const [isStartingWork, setIsStartingWork] = useState(false);

  const handleCancelOrder = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(id), {
        status: 'Cancelled',
      });
      if (res.data?.success) {
        toast.success('Service request has been cancelled.');
        setIsCancelModalOpen(false);
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel work order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleWorkerArrival = async () => {
    if (!id) return;
    setIsStartingWork(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(id), {
        status: 'InProgress',
        trackingStage: 'Arrived',
      });
      if (res.data?.success) {
        toast.success('Worker arrival confirmed! Service is now in progress.');
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start work');
    } finally {
      setIsStartingWork(false);
    }
  };

  // Auto-detect worker arrival when worker reaches location
  useEffect(() => {
    if (!id || !workOrder) return;
    const isAssigned = workOrder.status === 'Assigned' || (workOrder.status === 'Open' && Boolean((workOrder as any).isAccepted));
    if (!isAssigned) return;

    if (navigator.geolocation && isFieldTeam) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const wLat = Number(workOrder.locationLat) || 31.4620;
          const wLng = Number(workOrder.locationLng) || 74.2458;
          const R = 6371;
          const dLat = ((wLat - pos.coords.latitude) * Math.PI) / 180;
          const dLng = ((wLng - pos.coords.longitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((pos.coords.latitude * Math.PI) / 180) *
              Math.cos((wLat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distKm = R * c;

          if (distKm <= 0.35 && !isStartingWork) {
            handleWorkerArrival();
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  }, [id, workOrder?.status, isFieldTeam]);

  const handleMarkDoneByClient = async () => {
    if (!id) return;
    setIsMarkingDone(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(id), {
        status: 'Completed',
      });
      if (res.data?.success) {
        setWorkOrder((prev: any) => prev ? {
          ...prev,
          status: 'Completed',
          progressStage: 'Service Completed & Client Verified',
          progressPercentage: 100
        } : prev);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0d9488', '#10b981', '#f59e0b', '#3b82f6'],
        });
        toast.success('🎉 Work successfully marked as Done and Completed!');
        await fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete order');
    } finally {
      setIsMarkingDone(false);
    }
  };

  // Quality Verification Report Log
  const [verificationLog, setVerificationLog] = useState<any>(null);

  useEffect(() => {
    if (workOrder?.aiVerificationDetails) {
      setVerificationLog(workOrder.aiVerificationDetails);
    } else if (workOrder?.afterImageUrl && (workOrder?._id || workOrder?.id)) {
      const woId = workOrder._id || workOrder.id;
      apiClient.get(`/ai/verification/${woId}`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setVerificationLog(res.data.data);
          }
        })
        .catch(() => {});
    }

    if (workOrder) {
      let genuineBefore: string[] = [];
      if (Array.isArray(workOrder.beforeImages) && workOrder.beforeImages.length > 0) {
        genuineBefore = workOrder.beforeImages.filter(
          (img: any) => typeof img === 'string' && img.trim().length > 0
        );
      }
      if (genuineBefore.length === 0 && workOrder.beforeImageUrl) {
        genuineBefore = [workOrder.beforeImageUrl];
      }
      // Resilient local storage cache fallback
      if (genuineBefore.length === 0 && (id || workOrder.workOrderCode)) {
        try {
          const cached = localStorage.getItem(`cf_wo_before_${id}`) || (workOrder.workOrderCode ? localStorage.getItem(`cf_wo_before_${workOrder.workOrderCode}`) : null);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              genuineBefore = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
            }
          }
        } catch {}
      }
      setBeforeImages(genuineBefore);

      let genuineAfter: string[] = [];
      if (Array.isArray(workOrder.afterImages) && workOrder.afterImages.length > 0) {
        genuineAfter = workOrder.afterImages.filter(
          (img: any) => typeof img === 'string' && img.trim().length > 0
        );
      }
      if (genuineAfter.length === 0 && workOrder.afterImageUrl) {
        genuineAfter = [workOrder.afterImageUrl];
      }
      if (genuineAfter.length === 0 && (id || workOrder.workOrderCode)) {
        try {
          const cached = localStorage.getItem(`cf_wo_after_${id}`) || (workOrder.workOrderCode ? localStorage.getItem(`cf_wo_after_${workOrder.workOrderCode}`) : null);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              genuineAfter = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
            }
          }
        } catch {}
      }
      setAfterImages(genuineAfter);

      if (workOrder.clientFeedback) {
        setClientFeedbackRating(workOrder.clientFeedback.rating || 5);
        setClientFeedbackSatisfaction(workOrder.clientFeedback.satisfaction || 'Approved');
        setClientFeedbackComment(workOrder.clientFeedback.comment || '');
      }

      if (workOrder.adminInspection) {
        setAdminDecision(workOrder.adminInspection.status || 'Passed');
        setAdminNotes(workOrder.adminInspection.notes || '');
      }
    }
  }, [workOrder]);

  // Client uploads Before photo slot
  const handleUploadBeforeSlot = async (slotIndex: number, dataUrl: string) => {
    if (!id) return;
    const updated = [...beforeImages];
    updated[slotIndex] = dataUrl;
    setBeforeImages(updated);
    try {
      localStorage.setItem(`cf_wo_before_${id}`, JSON.stringify(updated));
      if (workOrder?.workOrderCode) {
        localStorage.setItem(`cf_wo_before_${workOrder.workOrderCode}`, JSON.stringify(updated));
      }
    } catch {}
    setIsUploadingBeforeIndex(slotIndex);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.UPLOAD_BEFORE(id), {
        imageUrl: dataUrl,
        index: slotIndex,
      });
      if (res.data?.success) {
        toast.success(`📸 Before Photo ${slotIndex + 1} of 3 uploaded!`);
        if (res.data.data) {
          setWorkOrder(res.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload before photo');
    } finally {
      setIsUploadingBeforeIndex(null);
    }
  };

  const handleBeforeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP)');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        await handleUploadBeforeSlot(slotIndex, dataUrl);
      }
    } catch {
      toast.error('Failed to process image');
    }
    e.target.value = '';
  };

  const handleRemoveBeforeSlot = async (slotIndex: number) => {
    const updated = [...beforeImages];
    updated.splice(slotIndex, 1);
    setBeforeImages(updated);
    try {
      localStorage.setItem(`cf_wo_before_${id}`, JSON.stringify(updated));
      if (workOrder?.workOrderCode) {
        localStorage.setItem(`cf_wo_before_${workOrder.workOrderCode}`, JSON.stringify(updated));
      }
    } catch {}
    toast.success(`Before photo #${slotIndex + 1} removed`);
  };

  // Field Team uploads After photo slot (Only After photos for Field Team!)
  const handleUploadAfterSlot = async (slotIndex: number, dataUrl: string) => {
    if (!id) return;
    const updated = [...afterImages];
    updated[slotIndex] = dataUrl;
    setAfterImages(updated);
    try {
      localStorage.setItem(`cf_wo_after_${id}`, JSON.stringify(updated));
      if (workOrder?.workOrderCode) {
        localStorage.setItem(`cf_wo_after_${workOrder.workOrderCode}`, JSON.stringify(updated));
      }
    } catch {}
    setIsUploadingAfterIndex(slotIndex);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.UPLOAD_AFTER(id), {
        imageUrl: dataUrl,
        index: slotIndex,
      });
      if (res.data?.success) {
        toast.success(`📸 After Photo ${slotIndex + 1} uploaded successfully!`);
        if (res.data.data) {
          setWorkOrder(res.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload after photo');
    } finally {
      setIsUploadingAfterIndex(null);
    }
  };

  const handleAfterFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP)');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        await handleUploadAfterSlot(slotIndex, dataUrl);
      }
    } catch {
      toast.error('Failed to process image');
    }
    e.target.value = '';
  };

  const handleRemoveAfterSlot = async (slotIndex: number) => {
    const updated = [...afterImages];
    updated.splice(slotIndex, 1);
    setAfterImages(updated);
    try {
      localStorage.setItem(`cf_wo_after_${id}`, JSON.stringify(updated));
      if (workOrder?.workOrderCode) {
        localStorage.setItem(`cf_wo_after_${workOrder.workOrderCode}`, JSON.stringify(updated));
      }
    } catch {}
    toast.success(`After photo #${slotIndex + 1} removed`);
  };

  // Worker marks physical work completed
  const handleWorkerSubmitCompletion = async () => {
    if (!id) return;
    const notes = workerCompletionNotes.trim() || 'Work completed on site as requested.';
    setIsSubmittingWorkerCompletion(true);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.SUBMIT_COMPLETION(id), {
        completionNotes: notes,
        afterImages: afterImages.filter(Boolean),
      });
      if (res.data?.success) {
        toast.success('🎉 Completion submitted! The work is now Pending Client Confirmation.');
        setWorkOrder((prev: any) =>
          prev ? { ...prev, status: 'PendingClientConfirmation', progressStage: 'Pending Client Confirmation', progressPercentage: 95 } : prev
        );
        await fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit completion');
    } finally {
      setIsSubmittingWorkerCompletion(false);
    }
  };

  // Client verifies and confirms work completion (Stage 2)
  const handleClientConfirmCompletion = async () => {
    if (!id) return;
    setIsSubmittingConfirmation(true);
    try {
      const paid = Number(actualPaidAmount || workOrder?.agreedPrice || workOrder?.budget || 80);
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.CONFIRM_COMPLETION(id), {
        behaviorRating,
        qualityRating,
        overallRating,
        comment: feedbackComments.trim(),
        amountActuallyPaid: paid,
        paymentMethod,
        satisfaction: 'Approved',
      });
      if (res.data?.success) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0d9488', '#10b981', '#f59e0b', '#3b82f6'],
        });
        toast.success('🎉 Work successfully verified & confirmed as Completed!');
        setIsConfirmModalOpen(false);
        setWorkOrder((prev: any) =>
          prev
            ? {
                ...prev,
                status: 'Completed',
                progressStage: 'Service Completed & Client Verified',
                progressPercentage: 100,
                actualAmountPaid: paid,
                paymentMethod,
              }
            : prev
        );
        await fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm completion');
    } finally {
      setIsSubmittingConfirmation(false);
    }
  };

  // Client requests revision if unsatisfied
  const handleClientRequestRevision = async () => {
    if (!id) return;
    if (!revisionReason.trim()) {
      toast.error('Please describe what issue was found or what needs revision.');
      return;
    }
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.CONFIRM_COMPLETION(id), {
        comment: revisionReason.trim(),
        satisfaction: 'ChangesRequested',
      });
      if (res.data?.success) {
        toast.success('Revision request sent to field technician and Admin.');
        setIsRevisionModalOpen(false);
        setWorkOrder((prev: any) =>
          prev ? { ...prev, status: 'RevisionRequired', progressStage: 'Revision Requested by Client' } : prev
        );
        await fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request revision');
    }
  };

  // Client submits feedback on before and after work photos
  const handleSubmitClientPhotoFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmittingClientFeedback(true);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.CLIENT_FEEDBACK(id), {
        rating: clientFeedbackRating,
        satisfaction: clientFeedbackSatisfaction,
        comment: clientFeedbackComment,
      });
      if (res.data?.success) {
        toast.success('Photo verification feedback submitted to supervisor & crew!');
        if (res.data.data) setWorkOrder(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit photo feedback');
    } finally {
      setIsSubmittingClientFeedback(false);
    }
  };

  // Admin executes AI & official visual quality inspection
  const handleRunAdminInspectionAudit = async (decisionOverride?: 'Passed' | 'Flagged' | 'Pending') => {
    if (!id) return;
    const rawDecision = decisionOverride || adminDecision;
    const decision: 'Passed' | 'Flagged' = rawDecision === 'Flagged' ? 'Flagged' : 'Passed';
    setIsAdminInspecting(true);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.ADMIN_INSPECTION(id), {
        decision,
        notes: adminNotes.trim() || (decision === 'Flagged' ? 'Flagged during supervisor audit for rework.' : 'Verified compliant with facility SLA standards.'),
      });
      if (res.data?.success) {
        toast.success(`Admin inspection completed: ${decision === 'Passed' ? 'Verified Clean & Complete' : 'Flagged for Rework'}`);
        if (res.data.data) {
          setWorkOrder(res.data.data);
          if (res.data.data.aiVerificationDetails) {
            setVerificationLog(res.data.data.aiVerificationDetails);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to run admin inspection');
    } finally {
      setIsAdminInspecting(false);
    }
  };

  const fetchOrderDetail = async () => {
    if (!id) return;

    // Fast-path: Check local cache first for instant zero-latency load
    try {
      const cached = localStorage.getItem('clearflow_cached_work_orders');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const tid = String(id).toLowerCase().trim();
          const match = list.find((w: any) => {
            const wid = String(w._id || w.id || '').toLowerCase().trim();
            const wcode = String(w.workOrderCode || '').toLowerCase().trim();
            return wid === tid || wcode === tid;
          });
          if (match) {
            setWorkOrder((prev) => prev || match);
          }
        }
      }
    } catch (_) {}

    try {
      const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BY_ID(id));
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setWorkOrder(data);

        // Update local cache with latest fresh data
        try {
          const cached = localStorage.getItem('clearflow_cached_work_orders');
          let list = cached ? JSON.parse(cached) : [];
          if (!Array.isArray(list)) list = [];
          const idx = list.findIndex((w: any) => (w._id && w._id === data._id) || (w.workOrderCode && w.workOrderCode === data.workOrderCode));
          if (idx >= 0) list[idx] = data;
          else list.unshift(data);
          localStorage.setItem('clearflow_cached_work_orders', JSON.stringify(list.slice(0, 50)));
        } catch (_) {}

        if (data.workOrderCode && id !== data.workOrderCode && !id.startsWith('WO-')) {
          navigate(`/work-orders/${data.workOrderCode}`, { replace: true });
        }
        return;
      }
    } catch (err: any) {
      // Resilient fallback: Try resolving from work-orders list in case of ID/code resolution mismatch
      try {
        const listRes = await apiClient.get(ENDPOINTS.WORK_ORDERS.BASE);
        if (listRes.data?.success && listRes.data?.data) {
          const list = Array.isArray(listRes.data.data) ? listRes.data.data : listRes.data.data.data || [];
          const match = list.find((w: any) => {
            const wid = String(w._id || w.id || '').toLowerCase().trim();
            const wcode = String(w.workOrderCode || '').toLowerCase().trim();
            const tid = String(id).toLowerCase().trim();
            return wid === tid || wcode === tid;
          });
          if (match) {
            setWorkOrder(match);
            return;
          }
        }
      } catch (_) {}

      // Check cache one more time before showing error
      try {
        const cached = localStorage.getItem('clearflow_cached_work_orders');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            const tid = String(id).toLowerCase().trim();
            const match = list.find((w: any) => {
              const wid = String(w._id || w.id || '').toLowerCase().trim();
              const wcode = String(w.workOrderCode || '').toLowerCase().trim();
              return wid === tid || wcode === tid;
            });
            if (match) {
              setWorkOrder(match);
              return;
            }
          }
        }
      } catch (_) {}

      const errorMsg = err.response?.data?.message || 'Failed to load work order details';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamsForOverride = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS.BASE);
      if (res.data?.success && res.data?.data) {
        const teams = res.data.data;
        setAvailableTeams(teams);
        if (teams.length > 0) setSelectedTeamId(teams[0]._id);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchOrderDetail();
    if (isAdmin) {
      fetchTeamsForOverride();
    }

    const socket = socketClient.getSocket();
    if (socket) {
      const handleProgressEvent = (data: any) => {
        if (data.workOrderId === id || data.workOrderCode === id) {
          setWorkOrder((prev: any) => prev ? {
            ...prev,
            progressPercentage: data.progressPercentage,
            progressStage: data.progressStage,
            status: data.status || prev.status,
          } : prev);
        }
      };

      const handleUpdateEvent = (data: any) => {
        if (data.workOrderId === id || data.workOrderCode === id) {
          setWorkOrder((prev: any) => prev ? {
            ...prev,
            ...data,
          } : prev);
          if (data.aiVerificationDetails) {
            setVerificationLog(data.aiVerificationDetails);
          }
        }
      };

      socket.on('workOrder:progress', handleProgressEvent);
      socket.on('workOrder:updated', handleUpdateEvent);

      return () => {
        socket.off('workOrder:progress', handleProgressEvent);
        socket.off('workOrder:updated', handleUpdateEvent);
      };
    }
  }, [id, isAdmin]);

  const handleUpdateProgress = async (pct: number, stageName: string) => {
    if (!id) return;
    setWorkOrder((prev: any) => prev ? {
      ...prev,
      progressPercentage: pct,
      progressStage: stageName,
      status: pct === 100 && prev.status === 'InProgress' ? 'PendingReview' : pct > 0 && prev.status === 'Assigned' ? 'InProgress' : prev.status,
    } : prev);

    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_PROGRESS(id), {
        percentage: pct,
        stage: stageName,
      });
      if (res.data?.success) {
        toast.success(`Work Status Updated: ${stageName}`);
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleOverrideDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedTeamId) return;

    setIsOverriding(true);
    try {
      const res = await apiClient.patch(`/work-orders/${id}/assign`, {
        teamId: selectedTeamId,
        reason: overrideReason,
      });

      if (res.data?.success) {
        toast.success('Team assignment successfully overridden');
        setIsOverrideOpen(false);
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to override assignment');
    } finally {
      setIsOverriding(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsIssuingInvoice(true);
    try {
      const res = await apiClient.post('/invoices', {
        workOrderId: id,
        amount: Number(invoiceAmount),
        items: [
          { description: invoiceDesc || `Facility Service: ${workOrder?.description || 'Work Order Delivery'}`, quantity: 1, unitPrice: Number(invoiceAmount), total: Number(invoiceAmount) }
        ],
      });

      if (res.data?.success) {
        toast.success('Digital invoice issued successfully!');
        setIsInvoiceOpen(false);
        navigate('/invoices');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    } finally {
      setIsIssuingInvoice(false);
    }
  };

  const handleDeleteWorkOrder = async () => {
    const targetId = workOrder?._id || workOrder?.id || id || workOrder?.workOrderCode;
    const code = workOrder?.workOrderCode;
    if (!targetId) return;
    setIsDeleting(true);
    try {
      const raw = localStorage.getItem('clearflow_deleted_work_orders');
      const set = new Set<string>();
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) arr.forEach((x: string) => set.add(String(x).toLowerCase().trim()));
      }
      [targetId, code, id, workOrder?._id, workOrder?.id].forEach((x) => {
        if (x) set.add(String(x).toLowerCase().trim());
      });
      localStorage.setItem('clearflow_deleted_work_orders', JSON.stringify(Array.from(set)));
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      window.dispatchEvent(new Event('storage'));
    } catch (_) {}

    try {
      const res = await apiClient.delete(`/work-orders/${targetId}`);
      if (res.data?.success) {
        toast.success('Work order deleted successfully');
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
        navigate('/work-orders');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete work order');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id && !workOrder) return;
    try {
      await downloadWorkOrderReport(workOrder);
    } catch (err: any) {
      toast.error('Could not download PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className={`w-10 h-10 animate-spin ${theme.spinner} mb-3`} />
        <p className="font-medium text-gray-600">Retrieving work order details from database...</p>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="w-full py-16 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Work Order Not Found</h2>
        <p className="text-gray-500 mb-6">The requested work order could not be located in the database.</p>
        <Button onClick={() => navigate('/work-orders')} className={theme.primaryBtn}>
          Back to Work Orders
        </Button>
      </div>
    );
  }

  const clientObj = typeof workOrder.clientId === 'object' && workOrder.clientId ? workOrder.clientId : null;
  const teamObj = typeof workOrder.teamId === 'object' && workOrder.teamId ? workOrder.teamId : null;
  const catObj = typeof workOrder.categoryId === 'object' && workOrder.categoryId ? (workOrder.categoryId as any) : null;
  const catName = catObj?.name || 'Facility Service';

  const code = workOrder.workOrderCode || '';
  const clientMapping = WORK_ORDER_CLIENTS[code];
  const clientDisplayName = clientObj?.name || (workOrder as any).clientName || (workOrder as any).client?.name || clientMapping?.name || 'Registered Client';
  const clientGender = clientMapping?.gender || (clientDisplayName.toLowerCase().includes('ayesha') || clientDisplayName.toLowerCase().includes('fatima') || clientDisplayName.toLowerCase().includes('priya') || clientDisplayName.toLowerCase().includes('zoya') ? 'girl' : 'boy');
  const isClientAli = (clientDisplayName && clientDisplayName.toLowerCase().trim() === 'ali') ||
                      (clientObj?.email && clientObj.email.toLowerCase() === 'ahsankhalid8657@gmail.com') ||
                      String(clientObj?._id || '').includes('ofpt') ||
                      (clientObj as any)?.id === 'C#01' ||
                      (workOrder as any).clientCode === 'C#01';
  const clientDisplayId = isClientAli ? 'C#01' : (clientMapping?.id || (clientObj?._id ? (String(clientObj._id).startsWith('C#') ? clientObj._id : `C#${String(clientObj._id).slice(-4)}`) : 'C#5643'));
  
  const isOrderOpen = workOrder.status === 'Open' || (workOrder.status as string) === 'Requested' || (!(workOrder as any).isAccepted && workOrder.status !== 'InProgress' && workOrder.status !== 'Closed' && workOrder.status !== 'Completed' && workOrder.status !== 'PendingReview');
  const isOrderAccepted = Boolean((workOrder as any).isAccepted || workOrder.status === 'Assigned' || workOrder.status === 'InProgress' || workOrder.status === 'PendingReview' || workOrder.status === 'PendingClientConfirmation' || workOrder.status === 'Completed' || workOrder.status === 'Closed');
  
  const rawAssignedWorker = (workOrder as any).assignedWorker;
  const rawDirectWorkerName = rawAssignedWorker?.name || (workOrder as any).workerName || (workOrder as any).acceptedBy || getWorkerNameForTeam(teamObj?.name || '') || (teamObj?.name && teamObj.name !== 'Unassigned' ? teamObj.name : '');
  const fallbackWorkerName = (workOrder.status === 'InProgress' || (workOrder as any).isAccepted || workOrder.status === 'PendingClientConfirmation') ? 'Ahmad' : '';
  const finalWorkerName = rawDirectWorkerName || fallbackWorkerName;
  const isOrderAssigned = Boolean(finalWorkerName || (teamObj?.name && teamObj.name !== 'Unassigned'));

  const teamName = isOrderAssigned ? (teamObj?.name || `${finalWorkerName} (Technician)`) : 'Unassigned';
  const isWorkerAhmad = (finalWorkerName && finalWorkerName.toLowerCase().trim() === 'ahmad') ||
                        (rawAssignedWorker?.name && rawAssignedWorker.name.toLowerCase().trim() === 'ahmad') ||
                        (rawAssignedWorker?.email && rawAssignedWorker.email.toLowerCase() === 'ahsankhalid8796@gmail.com') ||
                        String(rawAssignedWorker?._id || '').includes('ftx8') ||
                        rawAssignedWorker?.workerId === 'W#01' ||
                        rawAssignedWorker?.id === 'W#01' ||
                        (workOrder as any).workerCode === 'W#01';
  const workerDisplayId = isWorkerAhmad ? 'W#01' : (rawAssignedWorker?.workerId || (rawAssignedWorker?._id ? `W#${String(rawAssignedWorker._id).slice(-4)}` : (isOrderAssigned ? (TEAM_WORKER_IDS[teamName] || 'W#0012') : 'W#0000')));
  const workerName = isOrderAssigned ? finalWorkerName : 'Unassigned (Awaiting Technician)';

  const orderId = workOrder._id || workOrder.id;
  const formattedDate = workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently';

  const isAdm = theme.role === 'admin';
  const isField = theme.role === 'fieldteam';

  const roleStyles = isAdm ? {
    role: 'admin',
    primary: 'purple',
    cardGrad: 'bg-gradient-to-br from-purple-50/70 to-white border border-purple-200',
    cardBorder: 'border-purple-200',
    cardSubtleBorder: 'border-purple-200/70',
    cardSubtleBg: 'bg-purple-50/25',
    slotBox: 'border-purple-200/70 bg-purple-50/25',
    slotBorder: 'border-purple-200',
    headerIcon: 'text-purple-600',
    title: 'text-purple-950',
    subtitle: 'text-purple-700',
    badge: 'border-purple-300 text-purple-800 bg-purple-50',
    badgeDark: 'bg-purple-700 text-white',
    photoBadge: 'bg-purple-700/90 text-white',
    btnPrimary: 'bg-purple-700 hover:bg-purple-800 text-white shadow-sm shadow-purple-600/20',
    btnOutline: 'border-purple-300 text-purple-800 hover:bg-purple-50',
    link: 'text-purple-700 hover:text-purple-950',
    statusText: 'text-purple-800',
    boxBg: 'bg-purple-50/50 border-purple-100',
    awaitingBox: 'border-purple-100 text-purple-800 bg-purple-50/40',
    icon: 'text-purple-600',
    metricVal: 'text-purple-600',
    label: 'text-purple-900',
    textarea: 'border-purple-200 focus-visible:ring-purple-400',
    starActive: 'text-purple-600 fill-purple-600',
  } : isField ? {
    role: 'fieldteam',
    primary: 'amber',
    cardGrad: 'bg-gradient-to-br from-amber-50/60 to-white border border-amber-200',
    cardBorder: 'border-amber-200',
    cardSubtleBorder: 'border-amber-200/70',
    cardSubtleBg: 'bg-amber-50/25',
    slotBox: 'border-amber-200/70 bg-amber-50/25',
    slotBorder: 'border-amber-200',
    headerIcon: 'text-amber-600',
    title: 'text-amber-950',
    subtitle: 'text-amber-700',
    badge: 'border-amber-300 text-amber-800 bg-amber-50',
    badgeDark: 'bg-amber-600 text-white',
    photoBadge: 'bg-amber-600/90 text-white',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20',
    btnOutline: 'border-amber-400 text-amber-900 hover:bg-amber-50',
    link: 'text-amber-800 hover:text-amber-950',
    statusText: 'text-amber-800',
    boxBg: 'bg-amber-50/50 border-amber-100',
    awaitingBox: 'border-amber-100 text-amber-800 bg-amber-50/40',
    icon: 'text-amber-600',
    metricVal: 'text-amber-600',
    label: 'text-amber-900',
    textarea: 'border-amber-200 focus-visible:ring-amber-400',
    starActive: 'text-amber-500 fill-amber-500',
  } : {
    role: 'client',
    primary: 'teal',
    cardGrad: 'bg-gradient-to-br from-teal-50/60 to-white border border-teal-200',
    cardBorder: 'border-teal-200',
    cardSubtleBorder: 'border-teal-200/70',
    cardSubtleBg: 'bg-teal-50/20',
    slotBox: 'border-teal-200/70 bg-teal-50/20',
    slotBorder: 'border-teal-200',
    headerIcon: 'text-teal-600',
    title: 'text-teal-950',
    subtitle: 'text-teal-700',
    badge: 'border-teal-300 text-teal-800 bg-teal-50',
    badgeDark: 'bg-teal-700 text-white',
    photoBadge: 'bg-teal-700/90 text-white',
    btnPrimary: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm shadow-teal-600/20',
    btnOutline: 'border-teal-300 text-teal-800 hover:bg-teal-50',
    link: 'text-teal-700 hover:text-teal-900',
    statusText: 'text-teal-800',
    boxBg: 'bg-teal-50/50 border-teal-100',
    awaitingBox: 'border-teal-100 text-teal-800 bg-teal-50/30',
    icon: 'text-teal-600',
    metricVal: 'text-teal-600',
    label: 'text-teal-900',
    textarea: 'border-teal-200 focus-visible:ring-teal-400',
    starActive: 'text-amber-500 fill-amber-500',
  };

  // Completed work is strictly Completed or Closed
  const isWorkDone = 
    workOrder.status === 'Closed' || 
    workOrder.status === 'Completed' || 
    (workOrder as any).status?.toLowerCase() === 'completed' ||
    (workOrder as any).status?.toLowerCase() === 'closed';

  // Work submitted by worker awaiting client verification or admin review
  const isPendingReview = 
    workOrder.status === 'PendingReview' || 
    workOrder.status === 'PendingClientConfirmation' || 
    (workOrder as any).status?.toLowerCase() === 'pendingreview' ||
    (workOrder as any).status?.toLowerCase() === 'pending_review' ||
    (workOrder as any).status?.toLowerCase() === 'pendingclientconfirmation';

  // Render distinct status pill matching portal styling
  const renderStatusPill = (status?: string) => {
    const s = status || workOrder?.status || 'Open';
    switch (s) {
      case 'Closed':
      case 'Completed':
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
            Completed
          </span>
        );
      case 'InProgress':
      case 'in_progress':
      case 'inprogress':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-2xs",
            isClient 
              ? "bg-teal-600 text-white" 
              : isFieldTeam 
              ? "bg-amber-600 text-white" 
              : "bg-purple-600 text-white"
          )}>
            In Progress
          </span>
        );
      case 'Assigned':
      case 'assigned':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-2xs",
            isClient
              ? "bg-teal-50 text-teal-800 border border-teal-200/90"
              : isFieldTeam
              ? "bg-amber-50 text-amber-800 border border-amber-200/90"
              : "bg-purple-50 text-purple-800 border border-purple-200/90"
          )}>
            Assigned
          </span>
        );
      case 'PendingReview':
      case 'pending_review':
      case 'pendingreview':
      case 'Pending Review':
      case 'PendingClientConfirmation':
      case 'pendingclientconfirmation':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
            Work Done (Pending Review)
          </span>
        );
      case 'RevisionRequired':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
            Revision Required
          </span>
        );
      case 'Disputed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300 shadow-2xs">
            Disputed
          </span>
        );
      case 'Open':
      case 'open':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-2xs",
            isClient 
              ? "bg-cyan-50 text-cyan-800 border border-cyan-200/90" 
              : "bg-amber-50 text-amber-800 border border-amber-200/90"
          )}>
            {isClient ? 'Requested' : 'Open'}
          </span>
        );
      case 'Cancelled':
      case 'Refused':
      case 'cancelled':
      case 'refused':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200/90 shadow-2xs">
            {s}
          </span>
        );
    }
  };

  const handleGiveBonus = async () => {
    if (!id || bonusPoints <= 0) {
      toast.error('Please enter a valid amount of bonus points');
      return;
    }
    setIsGivingBonus(true);
    const targetWorkerId =
      (workOrder as any)?.assignedWorkerId ||
      (workOrder as any)?.workerId ||
      (workOrder as any)?.assignedTo?._id ||
      (workOrder as any)?.assignedTo ||
      '65f000000000000000000004';
    const techName = workerName || 'Technician';
    const pointsToAward = Number(bonusPoints) || 50;
    const cashToAward = Number(bonusCash) || 0;

    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.ADMIN_GIVE_BONUS, {
        workOrderId: workOrder?.workOrderCode || id,
        technicianId: targetWorkerId,
        technicianName: techName,
        points: pointsToAward,
        reason: bonusReason || 'Admin Special Bonus for Bidding',
        cashBonus: cashToAward,
      });

      // Synchronize worker local wallet
      try {
        const userKey = `clearflow_worker_wallet_${targetWorkerId}`;
        const storedWallet = localStorage.getItem('clearflow_worker_wallet') || localStorage.getItem(userKey);
        const parsed = storedWallet ? JSON.parse(storedWallet) : { pointsBalance: 160, withdrawableBalance: 380.0 };
        const newBalance = res.data?.data?.newPointsBalance;
        parsed.pointsBalance = typeof newBalance === 'number'
          ? newBalance
          : (Number(parsed.pointsBalance) || 160) + pointsToAward;
        if (cashToAward > 0) {
          parsed.withdrawableBalance = (Number(parsed.withdrawableBalance) || 0) + cashToAward;
        }
        localStorage.setItem('clearflow_worker_wallet', JSON.stringify(parsed));
        localStorage.setItem(userKey, JSON.stringify(parsed));
        localStorage.setItem(`cf_admin_bonus_${id}`, String(bonusAwardedPoints + pointsToAward));
        window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: parsed }));
      } catch {}

      setBonusAwardedPoints((prev) => prev + pointsToAward);
      setIsBonusModalOpen(false);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 },
      });

      toast.success(`🎉 Successfully awarded +${pointsToAward} bonus bidding points to ${techName}!`);
    } catch {
      // In demo mode or offline fallback, reward locally
      try {
        const userKey = `clearflow_worker_wallet_${targetWorkerId}`;
        const storedWallet = localStorage.getItem('clearflow_worker_wallet') || localStorage.getItem(userKey);
        const parsed = storedWallet ? JSON.parse(storedWallet) : { pointsBalance: 160, withdrawableBalance: 380.0 };
        parsed.pointsBalance = (Number(parsed.pointsBalance) || 160) + pointsToAward;
        if (cashToAward > 0) {
          parsed.withdrawableBalance = (Number(parsed.withdrawableBalance) || 0) + cashToAward;
        }
        localStorage.setItem('clearflow_worker_wallet', JSON.stringify(parsed));
        localStorage.setItem(userKey, JSON.stringify(parsed));
        localStorage.setItem(`cf_admin_bonus_${id}`, String(bonusAwardedPoints + pointsToAward));
        window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: parsed }));
      } catch {}
      setBonusAwardedPoints((prev) => prev + pointsToAward);
      setIsBonusModalOpen(false);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 },
      });
      toast.success(`🎉 Successfully awarded +${pointsToAward} bonus bidding points to ${techName}!`);
    } finally {
      setIsGivingBonus(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12 max-w-4xl lg:max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className={`${theme.rowHover} cursor-pointer`}>
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')} 
              className={`${theme.rowHover} text-gray-600 hover:text-gray-900 cursor-pointer font-medium h-8 px-2 rounded-lg`}
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
            </Button>
          )}
          <CategorySquircleLogo name={catName} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 break-words-safe">
              {workOrder.title || (
                catName && workOrder.locationAddress
                  ? `${catName === 'Cleaning' ? 'Deep Clean' : catName} – ${workOrder.locationAddress.split(',')[0].trim()}`
                  : 'Facility Service Order'
              )}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Submitted on {formattedDate}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* PDF Report Option */}
          {(workOrder.status === 'Closed' || workOrder.status === 'PendingReview' || (workOrder as any).status === 'Completed' || isAdmin) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadPdf}
              className="border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" /> PDF Report
            </Button>
          )}

          {isAdmin && (
            <>
              {workOrder.status !== 'Closed' && workOrder.status !== 'Completed' && (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(id!), { status: 'Completed' });
                      setWorkOrder((prev: any) => prev ? {
                        ...prev,
                        status: 'Completed',
                        progressStage: 'Service Completed & Approved',
                        progressPercentage: 100
                      } : prev);
                      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                      toast.success("Work Order approved and marked as Completed!");
                      await fetchOrderDetail();
                    } catch {
                      toast.error("Failed to mark order as completed");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideOpen(true)}
                className="border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Reassign Crew
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </>
          )}
          
          <Button 
            size="sm" 
            onClick={() => {
              const clientUserId = clientObj?._id || (clientObj as any)?.id || (typeof workOrder.clientId === 'string' ? workOrder.clientId : '');
              const clientEmail = clientObj?.email || (workOrder as any).clientEmail || '';
              const counterpartName = isField ? clientDisplayName : isAdm ? clientDisplayName : (workerName || 'Technician');
              const counterpartRole = isField ? 'Client' : isAdm ? 'Client' : 'Worker';
              const counterpartType = counterpartRole.toLowerCase();
              const counterpartId = isField ? (clientUserId || '') : (teamObj?._id || (teamObj as any)?.id || '');
              const targetOrderId = String(orderId || workOrder._id || workOrder.id || code || 'WO');

              navigate(`/chat/${encodeURIComponent(targetOrderId)}?userId=${encodeURIComponent(counterpartId)}&name=${encodeURIComponent(counterpartName)}&role=${encodeURIComponent(counterpartRole)}&type=${encodeURIComponent(counterpartType)}&email=${encodeURIComponent(clientEmail)}&orderCode=${encodeURIComponent(code || '')}`);
            }}
            className={theme.primaryBtn}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Open Chat
          </Button>
        </div>
      </div>

      {/* ================= ACTION CONTROLS (Hidden in Admin portal) ================= */}
      {!isAdmin && (
        <>
          {/* Field Team: Live status banner during InProgress */}
          {isFieldTeam && workOrder.status === 'InProgress' && (
            <Card className="border border-amber-300 bg-amber-50/60 shadow-xs rounded-2xl overflow-hidden p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-amber-700 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-950">Work in Progress</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      You are actively performing on-site service. Mark work as done when finished.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('field-completion-stage');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else handleWorkerSubmitCompletion();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1 text-white" />
                  Mark as Done
                </Button>
              </div>
            </Card>
          )}

          {/* Client: Live status banner during InProgress */}
          {isClient && workOrder.status === 'InProgress' && (
            <Card className="border border-teal-300 bg-teal-50/60 shadow-xs rounded-2xl overflow-hidden p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-teal-700 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-teal-950">Technician on Site</h4>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Technician has arrived and is actively performing work on site.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setActualPaidAmount(workOrder.agreedPrice || workOrder.budget || 80);
                    setIsConfirmModalOpen(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1 text-white" />
                  Mark as Done
                </Button>
              </div>
            </Card>
          )}

          {/* General status cards for Open / Assigned / Cancelled */}
          {workOrder.status !== 'InProgress' && workOrder.status !== 'PendingClientConfirmation' && workOrder.status !== 'PendingReview' && workOrder.status !== 'RevisionRequired' && (
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="p-4 sm:p-5">
                {workOrder.status === 'Cancelled' && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">This Service Request has been Cancelled</p>
                        <p className="text-xs text-red-700 mt-0.5">No further field technician operations or charges will occur.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/work-orders')}
                      className="border-red-300 text-red-700 hover:bg-red-100/60 font-bold text-xs rounded-xl"
                    >
                      Back to Orders
                    </Button>
                  </div>
                )}

                {workOrder.status !== 'Cancelled' && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Client Open Order: Centered Cancel Button */}
                    {isClient && workOrder.status === 'Open' && (
                      <div className="flex items-center justify-center w-full py-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs sm:text-sm h-10 px-8 rounded-xl cursor-pointer shadow-xs transition-all hover:shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>Cancel Order</span>
                        </Button>
                      </div>
                    )}

                    {/* Centered: Real-Time Service Status Banner for Non-Open Status */}
                    {isClient && workOrder.status !== 'Open' && (
                      <div className="flex items-center justify-between w-full py-1 gap-3 flex-wrap">
                        {workOrder.status === 'Assigned' ? (
                          <>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/90 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <Navigation className="w-4 h-4 text-teal-600 animate-pulse" />
                              </div>
                              <div className="text-left">
                                <span className="font-bold text-xs text-gray-900 block">Specialist Dispatched & En Route</span>
                                <span className="text-[11px] text-teal-800 font-medium"><strong>{workerName || 'Assigned Specialist'}</strong> is on the way to your location.</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => navigate('/tracking')}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 ml-auto"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Track Specialist Location
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/90 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                              <Clock className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="text-left">
                              <span className="font-bold text-xs text-gray-900 block">Order Status: {workOrder.status}</span>
                              <span className="text-[11px] text-gray-500">Service request is recorded in the ClearFlow system.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Client View: Pending Worker Counter-Quotation Banner */}
                    {isClient && workOrder.status === 'Open' && (workOrder as any).quotationPrice && Number((workOrder as any).quotationPrice) !== Number(workOrder.budget) && (
                      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200 animate-in fade-in-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-xs text-gray-900 block">Specialist Counter-Quote Received</span>
                            <span className="text-[11px] text-amber-900">Worker proposed <strong>PKR {Number((workOrder as any).quotationPrice).toFixed(2)}</strong> (Your target was PKR {Number(workOrder.budget || 80).toFixed(2)})</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleClientAcceptCounterQuote(Number((workOrder as any).quotationPrice))}
                          disabled={isAcceptingCounterOffer}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                        >
                          {isAcceptingCounterOffer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Accept Quote & Assign Specialist
                        </Button>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-gray-900 block">Administrative Oversight</span>
                          <span className="text-[11px] text-purple-800/80 font-medium">Full management access for order <strong>{workOrder.workOrderCode || workOrder._id}</strong>.</span>
                        </div>
                      </div>
                    )}

                    {/* Worker Status & Bidding Controls */}
                    {isFieldTeam && (
                      <div className="flex items-center justify-center w-full gap-2.5 flex-wrap">
                        {workOrder.status !== 'Closed' && workOrder.status !== 'Completed' && !(workOrder as any).isAccepted && (
                          <>
                            <Button
                              type="button"
                              onClick={handleAcceptOrder}
                              disabled={isAccepting || hasOtherActiveJob}
                              className={cn(
                                "font-bold text-xs sm:text-sm h-10 px-6 rounded-xl shadow-sm transition-all",
                                hasOtherActiveJob
                                  ? "bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-75"
                                  : "text-white bg-amber-600 hover:bg-amber-700 cursor-pointer hover:shadow-md active:scale-95"
                              )}
                              title={hasOtherActiveJob ? "Complete your active in-progress job before accepting new work" : undefined}
                            >
                              {isAccepting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                              {hasOtherActiveJob ? 'Finish Current Job to Accept' : `Accept (PKR ${Number(workOrder.budget || 80).toFixed(0)})`}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setCounterBidPrice(Number(workOrder.budget || 1500));
                                setIsCounterBidOpen(true);
                              }}
                              disabled={hasOtherActiveJob}
                              className="border-amber-400 text-amber-900 hover:bg-amber-50 font-bold text-xs sm:text-sm h-10 px-5 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                              Counter-Quote / Custom Bid
                            </Button>
                          </>
                        )}

                        {(workOrder.status === 'Assigned' || (workOrder.status === 'Open' && (workOrder as any).isAccepted)) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              onClick={handleWorkerArrival}
                              disabled={isStartingWork}
                              className="text-white font-bold text-xs sm:text-sm h-10 px-7 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 hover:shadow-md active:scale-95"
                            >
                              {isStartingWork ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Navigation className="w-4 h-4 mr-1.5" />}
                              Worker Arrived (Start Work)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => navigate('/tracking')}
                              className="border-amber-300 text-amber-900 hover:bg-amber-50 font-bold text-xs sm:text-sm h-10 px-5 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <MapPin className="w-4 h-4 text-amber-600" />
                              View Route on Map
                            </Button>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Right Side: Action Buttons for Admin or Assigned Client */}
                    {!(isClient && workOrder.status === 'Open') && (isClient || isAdmin) && workOrder.status !== 'Closed' && workOrder.status !== 'Completed' && (
                      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs h-10 px-4 rounded-xl cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 mr-1 text-red-500" /> Cancel Order
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Centered Full-Size Order Details & Quality Verification */}
      <div className="w-full space-y-6">
          {/* Main Problem Description Card */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Incident Details & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Description</span>
                <p className="text-gray-900 font-medium text-base mt-1 whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </div>

              {/* Explicit Display: Service Category, Client Original Budget, Preferred Arrival Time, Worker Quotation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Service Category</span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <CategorySquircleLogo name={catName} size="xs" />
                    <span className="text-xs font-extrabold text-gray-900 block">{catName || 'Facility Service'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Client Target Budget</span>
                  <span className="text-sm font-black text-emerald-950 mt-0.5 block">
                    PKR {Number(workOrder.budget || workOrder.estimatedPrice || 80).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Preferred Arrival Time</span>
                  <span className="text-xs font-bold text-teal-950 mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{workOrder.preferredTime || 'Immediate Dispatch'}</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Worker Quotation</span>
                  <span className="text-xs font-extrabold text-amber-950 mt-1 block">
                    {workOrder.agreedPrice || (workOrder as any).quotationPrice
                      ? `PKR ${Number(workOrder.agreedPrice || (workOrder as any).quotationPrice).toFixed(2)} (Agreed)`
                      : 'Awaiting Quotation'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2.5">
                  <MapPin className={`w-5 h-5 ${theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600'} shrink-0`} />
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block">Facility Address</span>
                    <span className="text-sm font-medium text-gray-900">{workOrder.locationAddress}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2.5">
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs",
                    theme.role === 'admin'
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  )}>
                    {clientDisplayName ? clientDisplayName.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'CL'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{clientDisplayName}</span>
                      <span className={cn(
                        "text-xs font-mono font-bold px-1.5 py-0.2 rounded border shadow-2xs",
                        theme.role === 'admin'
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : theme.role === 'fieldteam'
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-teal-50 text-teal-800 border-teal-200"
                      )}>
                        {clientDisplayId}
                      </span>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold block mt-0.5",
                      theme.role === 'admin' ? "text-purple-700" : theme.role === 'fieldteam' ? "text-amber-800" : "text-teal-700"
                    )}>
                      Client
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3 Hidden file inputs for Client Before Photos */}
          {beforeFileInputRefs.map((ref, idx) => (
            <input
              key={`wo-before-file-${idx}`}
              type="file"
              ref={ref}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleBeforeFileSelect(e, idx)}
            />
          ))}

          {/* 3 Hidden file inputs for Field Team After Photos */}
          {afterFileInputRefs.map((ref, idx) => (
            <input
              key={`wo-after-file-${idx}`}
              type="file"
              ref={ref}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAfterFileSelect(e, idx)}
            />
          ))}

          {/* Visual Quality Verification Gallery Section */}
          <Card className={cn("border-none shadow-sm overflow-hidden", roleStyles.cardGrad)}>
            <CardHeader className="pb-3 border-b border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("w-5 h-5", roleStyles.headerIcon)} />
                <div>
                  <CardTitle className="text-lg">Visual Inspection Evidence</CardTitle>
                  <p className="text-xs text-gray-500">
                    Client 3 Before Photos • Worker 3 Completion Photos • Quality Inspection Evidence
                  </p>
                </div>
              </div>
              {isWorkDone && workOrder.adminInspection && (
                <div className="flex items-center gap-2">
                  <Badge className={cn("font-mono text-xs px-2.5 py-1", workOrder.adminInspection.status === 'Flagged' ? 'bg-amber-600 text-white' : roleStyles.badgeDark)}>
                    {workOrder.adminInspection.status === 'Passed' ? 'Verified Clean & Complete' : 'Flagged for Rework'}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {/* Photos Grid: Client Before Photos and Worker Completion Photos */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {/* 1. Client 3 Before Photos (Always visible as initial request condition) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className={cn("w-4 h-4", roleStyles.headerIcon)} />
                      Client Initial Condition ({beforeImages.length}/3 Photos)
                    </span>
                    <Badge variant="outline" className={cn("text-[10px]", roleStyles.badge)}>
                      Uploaded by Client
                    </Badge>
                  </div>

                  {beforeImages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center bg-gray-50/60 flex flex-col items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs font-semibold text-gray-700">No before photos attached (0/3 uploaded)</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Client did not upload initial condition images with this request.
                      </p>
                      {(isClient || isAdmin) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => beforeFileInputRefs[0]?.current?.click()}
                          disabled={isUploadingBeforeIndex !== null}
                          className={cn("mt-3 text-xs h-7.5 font-medium px-3", roleStyles.btnOutline)}
                        >
                          <Camera className="w-3.5 h-3.5 mr-1" />
                          Upload Before Photo
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[0, 1, 2].map((idx) => {
                        const currentImg = beforeImages[idx];
                        if (!currentImg && !isClient && !isAdmin) return null;
                        return (
                          <div
                            key={`wo-before-slot-${idx}`}
                            className={cn("rounded-xl p-2.5 text-center flex flex-col justify-between shadow-xs border", roleStyles.slotBox)}
                          >
                            {currentImg ? (
                              <>
                                <div className={cn("relative h-28 sm:h-32 w-full rounded-lg overflow-hidden group border shadow-xs bg-black/20", roleStyles.slotBorder)}>
                                  <img
                                    src={currentImg}
                                    alt={`Before Photo #${idx + 1}`}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className={cn("absolute top-1.5 left-1.5 backdrop-blur-xs text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1", roleStyles.photoBadge)}>
                                    <Camera className="w-2.5 h-2.5" />
                                    <span>Before #{idx + 1}</span>
                                  </div>
                                </div>
                                {(isClient || isAdmin) && (
                                  <div className="flex justify-center mt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBeforeSlot(idx)}
                                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline"
                                    >
                                      Remove Photo
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="h-28 sm:h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center p-2">
                                <span className="text-[10.5px] text-gray-500 font-medium mb-1.5">Slot #{idx + 1} Empty</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => beforeFileInputRefs[idx]?.current?.click()}
                                  disabled={isUploadingBeforeIndex !== null}
                                  className={cn("text-[10.5px] cursor-pointer h-6 px-2", roleStyles.btnOutline)}
                                >
                                  + Add Photo #{idx + 1}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Field Team 3 After Photos (Always rendered so worker completion evidence is never hidden) */}
                <div className="space-y-3 animate-in fade-in-50 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className={cn("w-4 h-4", roleStyles.headerIcon)} />
                      Worker Completion Evidence
                    </span>
                    <Badge variant="outline" className={cn("text-[10px]", roleStyles.badge)}>
                      Uploaded by Crew
                    </Badge>
                  </div>

                  {!isOrderAccepted && afterImages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center bg-gray-50/50 flex flex-col items-center justify-center">
                      <Clock className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs font-semibold text-gray-700">Awaiting Worker Acceptance</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isFieldTeam
                          ? 'Please accept this service request first to start work and unlock after-photo uploads.'
                          : 'Completion photos will become available once a field specialist accepts and starts the work.'}
                      </p>
                    </div>
                  ) : afterImages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 p-6 text-center bg-amber-50/40 flex flex-col items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs font-semibold text-gray-700">No completion photos uploaded yet</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isFieldTeam || isAdmin
                          ? 'Upload photos of the completed work below to document finished service.'
                          : 'Assigned technician has not yet uploaded completion photos.'}
                      </p>
                      {(isFieldTeam || isAdmin) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => afterFileInputRefs[0]?.current?.click()}
                          disabled={isUploadingAfterIndex !== null}
                          className={cn("mt-3 text-xs h-7.5 font-medium px-3", roleStyles.btnOutline)}
                        >
                          <UploadCloud className="w-3.5 h-3.5 mr-1" />
                          Upload After Photo
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[0, 1, 2].map((idx) => {
                        const currentImg = afterImages[idx];
                        if (!currentImg && !isFieldTeam && !isAdmin) return null;
                        return (
                          <div
                            key={`wo-after-slot-${idx}`}
                            className={cn("rounded-xl p-2.5 text-center flex flex-col justify-between shadow-xs border", roleStyles.slotBox)}
                          >
                            {currentImg ? (
                              <>
                                <div className={cn("relative h-28 sm:h-32 w-full rounded-lg overflow-hidden group border shadow-xs bg-black/20", roleStyles.slotBorder)}>
                                  <img
                                    src={currentImg}
                                    alt={`After Photo #${idx + 1}`}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className={cn("absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1", roleStyles.photoBadge)}>
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>After #{idx + 1}</span>
                                  </div>
                                </div>
                                {(isFieldTeam || isAdmin) && (
                                  <div className="flex justify-center mt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAfterSlot(idx)}
                                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline"
                                    >
                                      Remove Photo
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="h-28 sm:h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center p-2">
                                <span className="text-[10.5px] text-gray-500 font-medium mb-1.5">Slot #{idx + 1} Empty</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => afterFileInputRefs[idx]?.current?.click()}
                                  disabled={isUploadingAfterIndex !== null}
                                  className={cn("text-[10.5px] cursor-pointer h-6 px-2", roleStyles.btnOutline)}
                                >
                                  + Add Photo #{idx + 1}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client & Worker Revision Alert Banner */}
          {workOrder.status === 'RevisionRequired' && (
            <div className="p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-950 flex items-center gap-3 shadow-xs animate-in fade-in-50 duration-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Revision Requested by Client</p>
                <p className="text-xs text-rose-800">
                  Client notes: "{(workOrder as any).clientFeedback?.comment || 'Adjustments required before final completion.'}"
                </p>
              </div>
            </div>
          )}

          {/* Client & Admin: Stage 2 Verification & Sign-off Card during PendingClientConfirmation or PendingReview */}
          {(isClient || isAdmin) && (workOrder.status === 'PendingClientConfirmation' || workOrder.status === 'PendingReview') && (
            <Card className="border-2 border-emerald-400 bg-emerald-50/60 shadow-md rounded-2xl overflow-hidden p-5 animate-in fade-in-50 duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                    <ShieldCheck className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-emerald-950 flex items-center gap-2">
                      Worker Submitted Completion — Verification & Sign-off Required
                    </h3>
                    <p className="text-xs text-emerald-900 mt-1">
                      {workerName || 'Field specialist'} has finished physical service and uploaded completion photos. Please review the visual evidence above and sign-off completion below.
                    </p>
                    {(workOrder as any).completionNotes && (
                      <p className="text-xs italic bg-white/80 p-2.5 rounded-lg border border-emerald-200 mt-2 text-emerald-900">
                        <strong>Worker Notes:</strong> "{(workOrder as any).completionNotes}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRevisionModalOpen(true)}
                    className="border-rose-300 text-rose-700 hover:bg-rose-100/60 font-bold text-xs h-9 px-3.5 rounded-xl cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    Report Issue / Revision
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setActualPaidAmount(workOrder.agreedPrice || workOrder.budget || 80);
                      setIsConfirmModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Confirm & Complete Work
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Field Team: Completion Form positioned at the end of details & evidence */}
          {isFieldTeam && (workOrder.status === 'InProgress' || workOrder.status === 'Assigned' || (Boolean((workOrder as any).isAccepted) && workOrder.status !== 'Closed' && workOrder.status !== 'Completed' && workOrder.status !== 'PendingClientConfirmation' && workOrder.status !== 'PendingReview')) && (
            <Card id="field-completion-stage" className="border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-2xl shadow-sm p-4 sm:p-5 space-y-3 animate-in fade-in-50 duration-200 scroll-mt-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm sm:text-base text-amber-950">
                    Mark Work as Done
                  </h3>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Provide completion notes for client confirmation and upload completed site photos in the Visual Inspection Evidence section above.
              </p>
              <div>
                <Label className="text-xs font-bold text-gray-700">Completion Notes for Client</Label>
                <Textarea
                  placeholder="Describe completed repairs, materials replaced, site condition..."
                  value={workerCompletionNotes}
                  onChange={(e) => setWorkerCompletionNotes(e.target.value)}
                  className="text-xs mt-1 border-amber-300 focus:ring-amber-500 bg-white"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-amber-800/80 font-medium">
                  {afterImages.length > 0 ? `${afterImages.length} photo${afterImages.length > 1 ? 's' : ''} attached above` : 'Optional photos can be attached above'}
                </span>
                <Button
                  type="button"
                  onClick={handleWorkerSubmitCompletion}
                  disabled={isSubmittingWorkerCompletion}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-4 cursor-pointer shadow-sm ml-auto"
                >
                  {isSubmittingWorkerCompletion ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Mark as Done & Submit for Confirmation
                </Button>
              </div>
            </Card>
          )}

          {/* Field Team: Pending Confirmation Banner when submitted */}
          {isFieldTeam && (workOrder.status === 'PendingClientConfirmation' || workOrder.status === 'PendingReview') && (
            <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Work Done — Submitted for Client Confirmation</p>
                  <p className="text-xs text-amber-800">You submitted completion photos and notes. The client and admin can now verify the completed work.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => afterFileInputRefs[Math.min(afterImages.length, 2)]?.current?.click()}
                className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs shrink-0 cursor-pointer font-semibold"
              >
                <Camera className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Add Photos
              </Button>
            </div>
          )}

          {/* When Work is not yet completed nor pending review: Show distinct status card for Admin & Client */}
          {!isWorkDone && !isPendingReview && (
            <>
              {isAdmin && (
                <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between gap-3.5 text-gray-900 shadow-xs animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      workOrder.status === 'InProgress' ? "bg-purple-50 border-purple-200 text-purple-700" :
                      workOrder.status === 'Assigned' ? "bg-blue-50 border-blue-200 text-blue-700" :
                      workOrder.status === 'Cancelled' ? "bg-rose-50 border-rose-200 text-rose-700" :
                      "bg-amber-50 border-amber-200 text-amber-700"
                    )}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {workOrder.status === 'InProgress' ? 'In Progress' :
                           workOrder.status === 'Assigned' ? 'Assigned' :
                           workOrder.status === 'Cancelled' ? 'Cancelled' :
                           workOrder.status === 'Open' ? 'Open' : workOrder.status}
                        </span>
                        {renderStatusPill(workOrder.status)}
                      </div>
                      <p className="text-gray-600 mt-0.5">
                        {workOrder.status === 'InProgress'
                          ? 'Technician is actively performing work on site. Completion photos and bonus evaluation will unlock once work is completed.'
                          : workOrder.status === 'Assigned'
                          ? 'Technician is assigned to this order. Work has not started yet.'
                          : workOrder.status === 'Cancelled'
                          ? 'This service request was cancelled. No technician bonus evaluation is required.'
                          : 'Service request is currently open and awaiting worker assignment.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {isClient && (
                <div className="p-4 bg-teal-50/60 border border-teal-200/70 rounded-2xl flex items-center justify-between text-xs text-teal-800 animate-in fade-in-50 duration-200">
                  <span className="flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      {workOrder.status === 'InProgress'
                        ? 'Technician has reached and is actively performing on-site service. You can mark work as done once satisfied.'
                        : (workOrder.status === 'PendingClientConfirmation' || workOrder.status === 'PendingReview')
                        ? 'Technician has marked work as completed. Please review completion evidence and mark as done.'
                        : 'Client satisfaction review & feedback will unlock once service is completed.'}
                    </span>
                  </span>
                  {(workOrder.status === 'InProgress' || workOrder.status === 'PendingClientConfirmation' || workOrder.status === 'PendingReview') && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setActualPaidAmount(workOrder.agreedPrice || workOrder.budget || 80);
                        setIsConfirmModalOpen(true);
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-7.5 px-3 rounded-lg cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Mark as Done
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* When Work is Complete or Pending Review: AI Inspection & Worker Bonus */}
          {(isWorkDone || isPendingReview) && (
            <>
              {/* Admin AI Quality Inspection Hub & Technician Bonus Evaluation */}
              <Card className={cn("border-none shadow-sm overflow-hidden animate-in fade-in-50 duration-300", roleStyles.cardGrad)}>
                <CardHeader className="pb-3 border-b border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={cn("w-5 h-5", roleStyles.headerIcon)} />
                    <div>
                      <CardTitle className="text-base text-gray-900">
                        {isAdmin ? 'Admin AI Inspection & Quality Audit Hub' : 'AI Inspection Verification Audit'}
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        Computer Vision &bull; Structural Difference &bull; SLA Compliance
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("font-mono text-xs", roleStyles.badge)}>
                    Quality: High (Optimal)
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* 4 Computer Vision Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Structural Delta</span>
                      <span className="text-base font-bold text-gray-900 mt-0.5 block">
                        Verified Change
                      </span>
                      <span className="text-[10px] text-gray-400">Physical change</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Cleanliness</span>
                      <span className={cn("text-base font-bold mt-0.5 block", roleStyles.metricVal)}>
                        Optimal Pass
                      </span>
                      <span className="text-[10px] text-gray-400">Surface restored</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Image Clarity</span>
                      <span className={cn("text-base font-bold mt-0.5 block", roleStyles.metricVal)}>
                        High Clarity
                      </span>
                      <span className="text-[10px] text-gray-400">Sharpness check</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Anti-Fraud</span>
                      <span className={cn("text-base font-bold mt-0.5 block", verificationLog?.fraudAnalysis?.fraudAlert ? 'text-rose-600' : roleStyles.metricVal)}>
                        {verificationLog?.fraudAnalysis?.fraudAlert ? 'Duplicate' : 'Verified'}
                      </span>
                      <span className="text-[10px] text-gray-400">Originality hash</span>
                    </div>
                  </div>

                  {/* Diagnostic Findings */}
                  {verificationLog?.findings && verificationLog.findings.length > 0 && (
                    <div className="pt-2 text-xs text-gray-700 space-y-1">
                      <span className="font-semibold text-gray-800 block text-[11px]">Diagnostic Findings:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                        {verificationLog.findings.map((f: any, idx: number) => (
                          <li key={`finding-${idx}`}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Admin Bonus Action Box (Only visible for Admin on Completed Orders) */}
                  {isAdmin && (
                    <div className="pt-3 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-3.5 rounded-xl border">
                      <div>
                        <p className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-purple-600" />
                          Technician Bonus Evaluation
                        </p>
                        <p className="text-[11px] text-purple-700 mt-0.5">
                          Review the uploaded photos and client feedback above to reward quality service.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsBonusModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <Gift className="w-3.5 h-3.5 text-purple-200" />
                        <span>{bonusAwardedPoints > 0 ? `Awarded (+${bonusAwardedPoints} pts) • Add More` : 'Give Bonus to Worker'}</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}


      </div>

      {/* Admin Dispatch Override Modal (F-21) */}
      {isOverrideOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-600 shrink-0" /> Reassign Worker Team
              </h3>
              <button onClick={() => setIsOverrideOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideDispatch} className="space-y-4">
              <div>
                <Label>Select Target Worker *</Label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availableTeams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} (Active Orders: {t.activeOrderCount || 0}, Rating: {t.averageRating || 4.8})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Reason for Manual Override *</Label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Dedicated tools on site, faster ETA, high-urgency escalation..."
                  className="mt-1 resize-none h-20"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsOverrideOpen(false)} className="w-full sm:w-auto cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 cursor-pointer w-full sm:w-auto" disabled={isOverriding}>
                  {isOverriding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirm Override
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Invoice Modal (F-26) */}
      {isInvoiceOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-purple-600 shrink-0" /> Issue Invoice
              </h3>
              <button onClick={() => setIsInvoiceOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <Label>Line Item Description</Label>
                <Input
                  value={invoiceDesc}
                  onChange={(e) => setInvoiceDesc(e.target.value)}
                  placeholder="Facility Service description..."
                  required
                />
              </div>

              <div>
                <Label>Total Amount (PKR)</Label>
                <Input
                  type="number"
                  min={1}
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsInvoiceOpen(false)} className="w-full sm:w-auto cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 cursor-pointer w-full sm:w-auto" disabled={isIssuingInvoice}>
                  {isIssuingInvoice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Issue Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Service Request Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl relative border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900">Decline Service Request</h3>
                  <p className="text-xs text-gray-500">Provide an optional reason for the client</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRejectModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Decline Reason (Optional)</Label>
              <Textarea
                placeholder="e.g. Technician unavailable for immediate assignment, equipment required is in maintenance, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-24 resize-none text-sm"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2 border-t border-gray-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isRejecting}
                className="cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleRejectOrder} 
                className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm shadow-red-600/20 cursor-pointer w-full sm:w-auto" 
                disabled={isRejecting}
              >
                {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl relative border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900">Cancel Work Order</h3>
                  <p className="text-xs text-gray-500">Are you sure you want to cancel this service request?</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCancelModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Cancellation Reason</Label>
              <Textarea
                placeholder="e.g. Issue resolved independently, schedule conflict, service requested in error, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="resize-none h-20 text-xs"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="font-semibold text-xs cursor-pointer w-full sm:w-auto"
              >
                Keep Order
              </Button>
              <Button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm w-full sm:w-auto"
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                Yes, Cancel Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Give Bonus Modal (Admin Theme) */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-3xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl relative border border-purple-100 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header in Admin Purple Theme */}
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 font-sidebar-title flex items-center gap-1.5">
                    Give Bonus Points
                  </h3>
                  <p className="text-xs text-gray-500">Award bidding points directly to the assigned technician</p>
                </div>
              </div>
              <button
                onClick={() => setIsBonusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assigned Technician Recipient Pill */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {workerName.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{workerName}</span>
                    <span className="text-[11px] font-mono font-bold text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200">
                      {workerDisplayId}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{teamName}</p>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                Assigned Provider
              </Badge>
            </div>

            {/* Quick Points Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Select Bonus Points (for Bidding)</span>
                <span className="text-purple-600 font-mono font-bold text-xs">+{bonusPoints} PTS</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 100, 200].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setBonusPoints(pts)}
                    className={cn(
                      "py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer text-center",
                      bonusPoints === pts
                        ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30"
                        : "bg-purple-50/60 text-purple-900 border border-purple-200/80 hover:bg-purple-100"
                    )}
                  >
                    +{pts} Pts
                  </button>
                ))}
              </div>
              <div className="pt-1">
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(Math.max(1, Number(e.target.value)))}
                  placeholder="Custom points amount..."
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Reason Presets & Custom Input */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-800">Reason / Note for Technician</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Bidding points grant for active provider',
                  'Quality & speed excellence bonus',
                  'Flawless AI inspection score',
                  'On-time arrival & great customer feedback',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBonusReason(preset)}
                    className={cn(
                      "text-[10.5px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left",
                      bonusReason === preset
                        ? "bg-purple-100 text-purple-900 border-purple-300 font-semibold"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                placeholder="Custom reason..."
                className="h-9 text-xs"
              />
            </div>

            {/* Action Buttons in Admin Purple Theme */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBonusModalOpen(false)}
                className="text-xs h-10 px-4 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGiveBonus}
                disabled={isGivingBonus || bonusPoints <= 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isGivingBonus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Awarding...
                  </>
                ) : (
                  <>
                    Award +{bonusPoints} Points
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Stage 2: 3-Rating Dimension & Payment Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-teal-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-1.5 font-sidebar-title">
                    Verify & Confirm Completion
                  </h3>
                  <p className="text-xs text-gray-500">Provide client ratings, feedback & record actual payment</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Service & Specialist Banner */}
            <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-teal-950">{workOrder.title || 'Facility Service Order'}</p>
                <p className="text-[11px] text-teal-700">Specialist: {workerName} ({teamName})</p>
              </div>
              <Badge className="bg-teal-600 text-white font-mono text-xs">
                {workOrder.workOrderCode}
              </Badge>
            </div>

            {/* 3 Rating Dimensions */}
            <div className="space-y-3.5 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Service Experience Ratings</h4>
              
              {/* 1. Worker Behavior */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-800 block">Worker Professionalism & Behavior</span>
                  <span className="text-[10.5px] text-gray-400">Punctuality, courtesy and communication</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={`behavior-star-${s}`}
                      type="button"
                      onClick={() => setBehaviorRating(s)}
                      className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={cn("w-5 h-5", s <= behaviorRating ? "fill-amber-400 text-amber-500" : "text-gray-300")} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Work Quality */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                <div>
                  <span className="text-xs font-semibold text-gray-800 block">Quality of Completed Work</span>
                  <span className="text-[10.5px] text-gray-400">Cleanliness, precision and durability</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={`quality-star-${s}`}
                      type="button"
                      onClick={() => setQualityRating(s)}
                      className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={cn("w-5 h-5", s <= qualityRating ? "fill-teal-500 text-teal-600" : "text-gray-300")} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Overall Experience */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                <div>
                  <span className="text-xs font-semibold text-gray-800 block">Overall Satisfaction</span>
                  <span className="text-[10.5px] text-gray-400">Overall platform and facility result</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={`overall-star-${s}`}
                      type="button"
                      onClick={() => setOverallRating(s)}
                      className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={cn("w-5 h-5", s <= overallRating ? "fill-emerald-500 text-emerald-600" : "text-gray-300")} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Written Feedback */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Client Review & Feedback Comments</Label>
              <Textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Share your experience regarding the completed work and technician performance..."
                className="resize-none h-20 text-xs"
              />
            </div>

            {/* Actual Amount Paid & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Amount Actually Paid (PKR) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={actualPaidAmount}
                  onChange={(e) => setActualPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 2500"
                  className="font-mono font-bold text-xs"
                  required
                />
                <span className="text-[10px] text-gray-400">Recorded separately from initial budget</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Payment Method Used *</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Cash">Cash on Delivery</option>
                  <option value="Bank Transfer">Bank Transfer / IBFT</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                </select>
                <span className="text-[10px] text-gray-400">Audited in Admin financial records</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleClientConfirmCompletion}
                disabled={isSubmittingConfirmation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isSubmittingConfirmation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Sign-off & Complete Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Stage 2 Revision / Issue Request Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-3xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900">Request Revision</h3>
                  <p className="text-xs text-gray-500">Describe what needs repair or rework before sign-off</p>
                </div>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Issue / Revision Details *</Label>
              <Textarea
                placeholder="Explain clearly what was left incomplete, leaked, uncleaned, or needs revision..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="h-28 resize-none text-xs"
                required
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-xs h-10 sm:h-9 px-4 rounded-xl cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleClientRequestRevision}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 sm:h-9 px-4.5 rounded-xl cursor-pointer shadow-sm w-full sm:w-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Submit Revision Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base sm:text-lg font-bold">Delete Work Order</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete this work order? This action cannot be undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-xs h-10 sm:h-9 px-4 rounded-xl cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteWorkOrder}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-10 sm:h-9 px-4 rounded-xl cursor-pointer shadow-xs w-full sm:w-auto"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Counter-Quote / Custom Bid Modal */}
      {isCounterBidOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Custom Bidding & Counter-Quote</h3>
                  <p className="text-xs text-gray-500">Propose custom pricing based on photos & scope</p>
                </div>
              </div>
              <button
                onClick={() => setIsCounterBidOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500 block">Client Target Budget:</span>
                <span className="font-extrabold text-amber-950 text-sm">PKR {Number(workOrder.budget || 80).toFixed(2)}</span>
              </div>
              <Badge variant="outline" className="border-amber-300 text-amber-800 font-mono text-xs">
                {workOrder.workOrderCode}
              </Badge>
            </div>

            <form onSubmit={handleCounterBidSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Your Quotation (PKR) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={counterBidPrice}
                  onChange={(e) => setCounterBidPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`e.g. ${Number(workOrder.budget || 1500) + 300}`}
                  className="font-mono font-bold text-sm"
                  required
                />
                <span className="text-[10.5px] text-gray-400">Increase or decrease price based on job complexity</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Estimated Arrival (Minutes) *</Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={counterBidEta}
                  onChange={(e) => setCounterBidEta(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 25"
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Scope Notes & Justification</Label>
                <Textarea
                  value={counterBidMessage}
                  onChange={(e) => setCounterBidMessage(e.target.value)}
                  placeholder="Explain why the price is adjusted based on inspection of photos, materials, or complexity..."
                  className="h-20 resize-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCounterBidOpen(false)}
                  className="text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCounterBid}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {isSubmittingCounterBid ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Submit Quotation to Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Worker Identity Verification Modal */}
      {isVerificationModalOpen && (
        <IdentityVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerified={() => {
            setIsVerificationModalOpen(false);
            handleAcceptOrder();
          }}
          role="FieldTeam"
          sourceActionTitle="accepting this job assignment"
        />
      )}
    </div>
  );
};
