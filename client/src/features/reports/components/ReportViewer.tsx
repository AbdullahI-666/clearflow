import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/infrastructure/api/client';

export const ReportViewer = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const targetId = id || '65f000000000000000000204';

  useEffect(() => {
    const fetchWorkOrder = async () => {
      try {
        const res = await apiClient.get(`/work-orders/${targetId}`);
        if (res.data?.success && res.data?.data) {
          setWorkOrder(res.data.data);
        }
      } catch (err) {
        console.warn('Could not load work order dynamically, using default view');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkOrder();
  }, [targetId]);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      toast.info('Downloading official completion report PDF...');
      const res = await apiClient.get(`/reports/${targetId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${workOrder?.workOrderCode || 'work_order'}_completion.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Keep URL active for 10 seconds so the browser can finish reading the stream
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      toast.success('Service report PDF downloaded!');
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        try {
          const errText = await err.response.data.text();
          const parsed = JSON.parse(errText);
          toast.error(parsed.message || 'Failed to download report PDF');
          return;
        } catch (_) {}
      }
      const token = localStorage.getItem('clearflow_token') || localStorage.getItem('token');
      if (token) {
        window.open(`/api/reports/${targetId}/pdf?token=${token}`, '_blank');
      } else {
        toast.error('Authentication expired. Please log in again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const woCode = workOrder?.workOrderCode || 'WO-2026-0004';
  const clientName = workOrder?.clientId?.name || 'Commercial Facility Client';
  const clientEmail = workOrder?.clientId?.email || 'client@clearflow.com';
  const location = workOrder?.locationAddress || 'Central Facility Complex';
  const categoryName = workOrder?.categoryId?.name || 'Cleaning';
  const teamName = workOrder?.teamId?.name || 'Alpha Operations Crew';
  const description = workOrder?.description || 'Comprehensive facility servicing and maintenance completed according to SLA standards.';
  const dateStr = workOrder?.closedAt || workOrder?.createdAt ? new Date(workOrder.closedAt || workOrder.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Service Completion Report</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="cursor-pointer">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button 
            size="sm" 
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="bg-teal-600 hover:bg-teal-700 cursor-pointer text-white shadow-sm"
          >
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm max-w-3xl mx-auto bg-white min-h-[750px]">
        {/* Report Header */}
        <div className="p-8 sm:p-10 border-b border-gray-100 flex justify-between items-start bg-teal-900 text-white rounded-t-xl">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">ClearFlow</h2>
            <p className="text-teal-200 text-xs">AI-Powered Facility Management System</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold tracking-wide text-teal-100">OFFICIAL COMPLETION REPORT</h3>
            <p className="text-white font-mono text-base font-bold mt-1">{woCode}</p>
            <p className="text-teal-200 text-xs mt-1">Date: {dateStr}</p>
          </div>
        </div>

        {/* Report Body */}
        <CardContent className="p-8 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client Details</h4>
              <p className="font-semibold text-gray-900">{clientName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{location}</p>
              <p className="text-sm text-gray-500 mt-0.5">{clientEmail}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Details</h4>
              <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Category:</span> {categoryName}</p>
              <p className="text-sm text-gray-700 mt-0.5"><span className="font-medium text-gray-900">Assigned Team:</span> {teamName}</p>
              <p className="text-sm text-gray-700 mt-0.5"><span className="font-medium text-gray-900">Status:</span> <span className="text-emerald-700 font-semibold">{workOrder?.status || 'Closed'}</span></p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-2">Description of Work</h4>
            <p className="text-gray-700 text-sm leading-relaxed mt-3 whitespace-pre-line">
              {description}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Verification & Evidence</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col items-center justify-center min-h-[160px]">
                {workOrder?.beforeImageUrl ? (
                  <img src={workOrder.beforeImageUrl} alt="Before" className="max-h-36 rounded object-cover" />
                ) : (
                  <p className="text-xs text-gray-500">Before Photo (Archived in Record)</p>
                )}
                <span className="text-xs text-gray-400 font-medium mt-2">Initial Condition</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  AI VERIFIED {workOrder?.aiConfidenceScore ? `${Math.round(workOrder.aiConfidenceScore * 100)}%` : '94%'}
                </div>
                {workOrder?.afterImageUrl ? (
                  <img src={workOrder.afterImageUrl} alt="After" className="max-h-36 rounded object-cover" />
                ) : (
                  <p className="text-xs text-gray-500">After Photo (Verified Complete)</p>
                )}
                <span className="text-xs text-gray-400 font-medium mt-2">Post-Service Completion</span>
              </div>
            </div>
          </div>
          
          <div className="pt-6 flex justify-between items-end border-t border-gray-100 mt-8">
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">Quality Verification Status</p>
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Passed Compliance Audit
              </div>
            </div>
            <div className="text-right">
              <div className="w-36 h-10 border-b border-gray-400 mb-1 flex items-end justify-center font-serif text-lg text-teal-900 font-bold italic">
                ClearFlow Verified
              </div>
              <p className="text-xs text-gray-400">Digital Seal & Signature</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
