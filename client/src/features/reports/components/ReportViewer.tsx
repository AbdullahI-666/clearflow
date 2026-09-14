import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer, Share2 } from 'lucide-react';

import { toast } from 'sonner';
import { apiClient } from '@/infrastructure/api/client';

export const ReportViewer = () => {
  const handleDownloadPdf = async () => {
    const token = localStorage.getItem('token');
    try {
      toast.info('Downloading official completion report PDF...');
      const res = await apiClient.get('/reports/65f000000000000000000204/pdf', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'WO-2026-0004_completion.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Service report PDF downloaded!');
    } catch (err) {
      window.open(`/api/reports/65f000000000000000000204/pdf?token=${token}`, '_blank');
      toast.success('Opening PDF report...');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service Report</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="cursor-pointer">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button 
            size="sm" 
            onClick={handleDownloadPdf}
            className="bg-teal-600 hover:bg-teal-700 cursor-pointer text-white shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm max-w-3xl mx-auto bg-white min-h-[800px]">
        {/* Report Header */}
        <div className="p-10 border-b border-gray-100 flex justify-between items-start bg-teal-900 text-white rounded-t-xl">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">ClearFlow</h2>
            <p className="text-teal-100 text-sm">Smart Facility Management</p>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-semibold mb-1">COMPLETED WORK ORDER</h3>
            <p className="text-teal-100 font-mono text-sm">WO-2023-0899</p>
            <p className="text-teal-100 text-sm mt-2">Date: Oct 20, 2023</p>
          </div>
        </div>

        {/* Report Body */}
        <CardContent className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client Details</h4>
              <p className="font-medium text-gray-900">Sarah Jenkins</p>
              <p className="text-sm text-gray-600">Tech Park Alpha</p>
              <p className="text-sm text-gray-600">sarah.j@example.com</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Details</h4>
              <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Category:</span> Cleaning</p>
              <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Assigned Team:</span> Clean Masters</p>
              <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Time to Complete:</span> 2h 15m</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-2">Description of Work</h4>
            <p className="text-gray-700 text-sm leading-relaxed mt-4">
              Completed scheduled weekly deep cleaning of main lobby, hallways, and all 4 restrooms on the ground floor. 
              Restocked all paper supplies and soap dispensers. Emptied all recycling and waste bins. 
              Floor polishing completed with industrial scrubber.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Verification</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 h-32 rounded flex items-center justify-center border border-gray-200">
                <p className="text-xs text-gray-500">Before Photo (Attached)</p>
              </div>
              <div className="bg-gray-50 h-32 rounded flex items-center justify-center border border-gray-200 relative overflow-hidden">
                 <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">AI VERIFIED 99%</div>
                <p className="text-xs text-gray-500">After Photo (Attached)</p>
              </div>
            </div>
          </div>
          
          <div className="pt-8 flex justify-between items-end border-t border-gray-100 mt-12">
            <div>
               <p className="text-xs text-gray-500 mb-1">Quality Assessment</p>
               <div className="flex gap-1 text-amber-400">
                 ★ ★ ★ ★ ★
               </div>
            </div>
            <div className="text-right">
              <div className="w-32 h-10 border-b border-gray-800 mb-2 font-handwriting text-2xl text-blue-900 flex items-end justify-center">
                S. Jenkins
              </div>
              <p className="text-xs text-gray-500">Client Signature</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
