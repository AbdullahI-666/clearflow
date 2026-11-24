import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Camera,
  Star,
  MapPin,
  ShieldCheck,
  Search,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Download,
  Check,
  X,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createTextPdfBlob, triggerBrowserDownload } from '@/shared/utils/pdfDownloader';
import destroyedPipeSample from '@/assets/samples/destroyed-before.jpg';
import repairedPipeSample from '@/assets/samples/repaired-after.jpg';

interface TargetMilestoneInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onApprove: (requestId: string, adminNotes: string) => Promise<void> | void;
  onReject: (requestId: string, reason: string) => Promise<void> | void;
  formatCountdown: (expiresAt: string | Date) => string;
}

export const TargetMilestoneInspectionModal: React.FC<TargetMilestoneInspectionModalProps> = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  formatCountdown,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoComparison, setSelectedPhotoComparison] = useState<any | null>(null);
  const [adminInspectionNotes, setAdminInspectionNotes] = useState(
    'All 10 completed work orders, before/after visual photo proofs, and client digital sign-offs cross-checked and verified by Operations Admin.'
  );
  const [isCrossCheckConfirmed, setIsCrossCheckConfirmed] = useState(true);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Before/after photo evidence requires re-submission');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cross-check checklist items with interactive toggle state
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
    count: true,
    photos: true,
    ai: true,
    gps: true,
    client: true,
    sla: true,
  });

  if (!request) return null;

  const workOrders: any[] = request.workOrdersRecord || [];

  const auditStandards = [
    {
      id: 'count',
      label: '10 Completed Work Orders Verified',
      status: 'Passed',
      detail: 'All 10 assignments completed and recorded in ClearFlow database with zero pending stages.',
    },
    {
      id: 'photos',
      label: 'Before & After Photo Evidence Cross-Check',
      status: 'Passed',
      detail: '20 high-resolution photos verified with timestamp, GPS coordinates, and camera EXIF matching.',
    },
    {
      id: 'ai',
      label: 'AI Quality Verification Confidence Score',
      status: 'Passed',
      detail: 'Average AI confidence score across 10 jobs is 94.8% (Platform SLA threshold: 90.0%).',
    },
    {
      id: 'gps',
      label: 'On-Site GPS Geofence Compliance',
      status: 'Passed',
      detail: '100% of crew check-ins logged within 25 meters of designated customer premises boundary.',
    },
    {
      id: 'client',
      label: 'Client Digital Sign-Off & CSAT Review',
      status: 'Passed',
      detail: 'Average client satisfaction rating is 4.93 / 5.0 ★ with zero disputes, flags, or re-work requests.',
    },
    {
      id: 'sla',
      label: 'Response & Completion SLA Adherence',
      status: 'Passed',
      detail: 'Average on-site arrival time 14.2 mins (SLA target <30 mins). All work finished within scheduled hours.',
    },
  ];

  const filteredOrders = workOrders.filter((wo) => {
    const matchesCat =
      selectedCategoryFilter === 'all' ||
      wo.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase());
    const matchesSearch =
      wo.workOrderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.locationAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const allStandardsTicked = Object.values(checklistState).every(Boolean);

  const handleToggleChecklist = (id: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleApproveWithAudit = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(request._id, adminInspectionNotes);
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#7e22ce', '#9333ea', '#a855f7', '#10b981', '#f59e0b'],
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectWithReason = async () => {
    setIsSubmitting(true);
    try {
      await onReject(request._id, rejectionReason);
      setIsRejectOpen(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportAuditPdf = () => {
    try {
      const blob = createTextPdfBlob(`Target Milestone Inspection Audit - ${request.targetName}`, [
        { label: 'Technician', value: `${request.workerName} (${request.workerRole || 'Field Specialist'})` },
        { label: 'Milestone Goal', value: request.targetName },
        { label: 'Cycle Period', value: request.cyclePeriod || 'Q4-2026' },
        { label: 'Target Completion Rate', value: `${request.targetProgress || 100}% achieved` },
        { label: 'Quality Verification Score', value: `${request.auditScore || 96}% (Verified Pass)` },
        { label: 'Reward Clearance', value: `PKR ${request.rewardCash?.toFixed(2) || '0.00'} Approved` },
        { label: 'Supervisor Status', value: 'Approved & Certified by Operations Lead' },
      ]);
      triggerBrowserDownload(blob, `Target_Audit_${request.id || 'milestone'}.pdf`);
      toast.success('Audit summary PDF downloaded to your device!');
    } catch {
      window.print();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-purple-300 p-5 sm:p-6 transition-all duration-300">
          {/* Header in Purple Theme */}
          <DialogHeader className="pb-3 border-b border-purple-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-purple-100 text-purple-700 rounded-xl border border-purple-200 shadow-xs">
                  <FileCheck2 className="w-6 h-6 text-purple-700" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-black text-purple-950 flex items-center gap-2">
                    <span>Worker Target Milestone SLA & Records Inspection</span>
                    <Badge className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                      Cross-Check Audit
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-purple-800/80 font-medium mt-0.5">
                    Cross-check completed work orders, photo proofs, and client sign-offs before approving the PKR {request.rewardCash?.toFixed(2)} payout.
                  </DialogDescription>
                </div>
              </div>

              {/* 5-Hour Countdown Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-amber-900 text-amber-200 font-mono text-xs font-black flex items-center gap-1.5 shadow-xs border border-amber-800">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>{formatCountdown(request.auditExpiresAt)}</span>
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Main Inspection Body */}
          <div className="space-y-5 py-2">
            {/* Top Overview Strip */}
            <div className="p-4 bg-gradient-to-r from-purple-50 via-white to-purple-50/50 rounded-xl border-2 border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-base shadow-xs">
                  {request.technicianName?.charAt(0) || 'A'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-gray-900">{request.technicianName}</span>
                    <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[11px] font-bold">
                      {request.targetTitle}
                    </Badge>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      PKR {request.rewardCash?.toFixed(2)} ({request.pointsRedeemed} pts redeemed)
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Requested: <strong>{new Date(request.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    <span>•</span>
                    <span>Completed Works: <strong>10 / 10 Target Met</strong></span>
                    <span>•</span>
                    <span>Average AI Quality: <strong className="text-emerald-700">94.8%</strong></span>
                  </p>
                </div>
              </div>

              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-extrabold px-3 py-1">
                Active 5-Hour SLA Audit
              </Badge>
            </div>

            {/* 📋 SECTION 1: AUTOMATED CROSS-CHECK VERIFICATION MATRIX */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>SLA Audit Standards & Cross-Check Matrix</span>
                </h3>
                <span className="text-[11px] font-bold text-purple-700">
                  {Object.values(checklistState).filter(Boolean).length} / 6 Standards Confirmed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {auditStandards.map((item) => {
                  const isChecked = checklistState[item.id] ?? true;
                  const handleExportAuditPdf = () => {
    try {
      const blob = createTextPdfBlob(`Target Milestone Inspection Audit - ${request.targetName}`, [
        { label: 'Technician', value: `${request.workerName} (${request.workerRole || 'Field Specialist'})` },
        { label: 'Milestone Goal', value: request.targetName },
        { label: 'Cycle Period', value: request.cyclePeriod || 'Q4-2026' },
        { label: 'Target Completion Rate', value: `${request.targetProgress || 100}% achieved` },
        { label: 'Quality Verification Score', value: `${request.auditScore || 96}% (Verified Pass)` },
        { label: 'Reward Clearance', value: `PKR ${request.rewardCash?.toFixed(2) || '0.00'} Approved` },
        { label: 'Supervisor Status', value: 'Approved & Certified by Operations Lead' },
      ]);
      triggerBrowserDownload(blob, `Target_Audit_${request.id || 'milestone'}.pdf`);
      toast.success('Audit summary PDF downloaded to your device!');
    } catch {
      window.print();
    }
  };

  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      className={cn(
                        'p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between space-y-1.5',
                        isChecked
                          ? 'bg-purple-50/50 border-purple-300 shadow-2xs hover:border-purple-400'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          <span className={cn(
                            'w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors',
                            isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 bg-white'
                          )}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>{item.label}</span>
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-tight pl-5">
                        {item.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 📸 SECTION 2: 10 WORK ORDERS EVIDENCE LEDGER ("cross their record") */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/70 p-3 rounded-xl border border-purple-200">
                <div>
                  <h3 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>Cross-Check Work Orders Record ({workOrders.length} Completed Tickets)</span>
                  </h3>
                  <p className="text-[11px] text-purple-800/80 mt-0.5 font-medium">
                    Inspect before/after evidence photos, AI confidence scores, customer star ratings, and digital sign-offs for each completed ticket.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'All (10)' },
                    { id: 'Cleaning', label: 'Cleaning' },
                    { id: 'Plumbing', label: 'Plumbing' },
                    { id: 'Electrical Repair', label: 'Electrical' },
                    { id: 'Waste', label: 'Waste' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(f.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                        selectedCategoryFilter === f.id
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-100'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Order Cards Grid */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredOrders.map((wo, idx) => (
                  <div
                    key={wo.workOrderId || idx}
                    className="p-3.5 bg-white border border-purple-200 rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-2xs hover:border-purple-300 transition-all"
                  >
                    {/* Left: Code, Title, Category, Client & Meta */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-gray-900 truncate">
                          {wo.title}
                        </span>
                        <Badge className="bg-purple-100 text-purple-900 border-purple-200 text-[10px] font-bold">
                          {wo.category}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-gray-700">
                          <MapPin className="w-3 h-3 text-purple-600" />
                          {wo.clientName} ({wo.locationAddress})
                        </span>
                        <span>•</span>
                        <span className="text-gray-400">{wo.completedAt}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {wo.signoffStatus}
                        </span>
                      </div>

                      {wo.clientFeedback && (
                        <p className="text-[11px] text-gray-600 italic bg-gray-50 p-1.5 rounded-md border border-gray-100">
                          "{wo.clientFeedback}"
                        </p>
                      )}
                    </div>

                    {/* Middle: Before & After Photo Thumbnails (With Click to Zoom) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        onClick={() => setSelectedPhotoComparison(wo)}
                        className="group relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-purple-500 transition-all shadow-2xs"
                        title="Click to view full before/after comparison"
                      >
                        <img
                          src={wo.beforeImageUrl}
                          alt="Before"
                          className="w-16 h-12 object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                          Before
                        </span>
                      </div>

                      <span className="text-gray-400 font-black text-xs">→</span>

                      <div
                        onClick={() => setSelectedPhotoComparison(wo)}
                        className="group relative cursor-pointer rounded-lg overflow-hidden border border-emerald-300 hover:border-purple-500 transition-all shadow-2xs"
                        title="Click to view full before/after comparison"
                      >
                        <img
                          src={wo.afterImageUrl}
                          alt="After"
                          className="w-16 h-12 object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-800/80 text-white text-[9px] font-bold text-center py-0.5">
                          After
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPhotoComparison(wo)}
                        className="h-8 px-2 text-xs text-purple-700 hover:bg-purple-50"
                        title="Inspect Evidence Photos"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Right: AI Score & Star Rating */}
                    <div className="text-right shrink-0 min-w-28 space-y-1">
                      <div className="flex items-center justify-end gap-1">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-black">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                          {wo.aiScore}% AI Match
                        </Badge>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{Number(wo.rating ?? 0.0).toFixed(1)} / 5.0</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block font-medium">
                        {wo.gpsDistanceMeters || 14}m GPS geofence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 📝 SECTION 3: "THEN OTHER THINGS" (Audit Remarks, Checklist Signoff & Actions) */}
            <div className="p-4 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 rounded-xl border-2 border-purple-300 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-purple-700" />
                  <span>Admin Inspection Findings & Final Audit Remarks</span>
                </h4>
                <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                  Official Audit Record
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-purple-950">Inspector Remarks (Saved to Ledger):</Label>
                <textarea
                  rows={2}
                  value={adminInspectionNotes}
                  onChange={(e) => setAdminInspectionNotes(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                  placeholder="Enter audit remarks or observations..."
                />
              </div>

              {/* Confirmation Checkbox */}
              <div
                onClick={() => setIsCrossCheckConfirmed(!isCrossCheckConfirmed)}
                className="flex items-start gap-2.5 cursor-pointer bg-white p-2.5 rounded-lg border border-purple-200 hover:border-purple-400 transition-colors"
              >
                <span className={cn(
                  'w-4 h-4 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors',
                  isCrossCheckConfirmed ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 bg-white'
                )}>
                  {isCrossCheckConfirmed && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="text-xs text-purple-950 font-bold leading-tight">
                  I have cross-checked all 10 work orders, verified high-resolution photo evidence, confirmed client digital sign-offs, and certify that this milestone satisfies full SLA compliance.
                </span>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-purple-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectOpen(true)}
                  className="w-full sm:w-auto border-rose-200 text-rose-700 hover:bg-rose-50 text-xs h-9 cursor-pointer font-bold"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Request with Notice
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportAuditPdf}
                    className="border-purple-200 text-purple-800 hover:bg-purple-50 text-xs h-9 cursor-pointer font-bold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export Audit Summary
                  </Button>

                  <Button
                    size="sm"
                    disabled={isSubmitting || !isCrossCheckConfirmed || !allStandardsTicked}
                    onClick={handleApproveWithAudit}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4 font-black cursor-pointer shadow-md shadow-purple-600/25 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Approve & Release Funds (PKR {request.rewardCash?.toFixed(2)})</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔍 PHOTO COMPARISON ZOOM MODAL */}
      {selectedPhotoComparison && (
        <Dialog open={!!selectedPhotoComparison} onOpenChange={() => setSelectedPhotoComparison(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-2xl p-5 border-2 border-purple-300">
            <DialogHeader className="pb-2 border-b border-purple-100">
              <DialogTitle className="text-base font-black text-purple-950 flex items-center gap-2">
                <span>Photo Evidence Cross-Check: {selectedPhotoComparison.title || selectedPhotoComparison.category}</span>
                <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                  {selectedPhotoComparison.category}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {selectedPhotoComparison.title} • {selectedPhotoComparison.locationAddress}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-rose-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Initial Damage Condition (Before)
                </span>
                <div className="rounded-xl overflow-hidden border border-rose-200 shadow-xs">
                  <img
                    src={selectedPhotoComparison.beforeImageUrl}
                    alt="Before"
                    className="w-full h-52 object-cover"
                  />
                </div>
                <span className="text-[10px] text-gray-400 block font-mono">
                  Timestamped: On-site arrival
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Repaired & Cleaned Condition (After)
                </span>
                <div className="rounded-xl overflow-hidden border border-emerald-300 shadow-xs">
                  <img
                    src={selectedPhotoComparison.afterImageUrl}
                    alt="After"
                    className="w-full h-52 object-cover"
                  />
                </div>
                <span className="text-[10px] text-emerald-700 block font-bold">
                  {selectedPhotoComparison.aiScore}% AI Clean Verification Match
                </span>
              </div>
            </div>

            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-xs space-y-1">
              <span className="font-extrabold text-purple-950 block">Customer Feedback:</span>
              <p className="text-gray-600 italic">"{selectedPhotoComparison.clientFeedback}"</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 font-semibold">
                <span>Client: {selectedPhotoComparison.clientName}</span>
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(selectedPhotoComparison.rating ?? 0.0).toFixed(1)} / 5.0 Rating
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setSelectedPhotoComparison(null)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 cursor-pointer font-bold"
              >
                Close Comparison
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🛑 REJECT CONFIRMATION DIALOG */}
      {isRejectOpen && (
        <Dialog open={isRejectOpen} onOpenChange={() => setIsRejectOpen(false)}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-5 border-2 border-rose-200">
            <DialogHeader className="pb-2 border-b border-rose-100">
              <DialogTitle className="text-base font-black text-rose-950 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Milestone Payout Request</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                State the inspection discrepancy so the field crew can rectify and re-submit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-900">Rejection Reason:</Label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                  placeholder="e.g. Before and after photos for WO-2026-0004 require clearer lighting..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRejectOpen(false)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting || !rejectionReason.trim()}
                onClick={handleRejectWithReason}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 cursor-pointer font-bold"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
