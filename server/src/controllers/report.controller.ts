import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as pdfService from '../services/pdf.service.js';
import { WorkOrder } from '../models/workOrder.model.js';
import { Invoice } from '../models/invoice.model.js';
import { MOCK_WORK_ORDERS } from '../services/workOrder.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getReport = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  let wo: any = null;
  if (mongoose.connection.readyState === 1) {
    try {
      wo = await WorkOrder.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(id) ? id : null },
          { workOrderCode: id },
        ],
      }).populate(['clientId', 'teamId', 'categoryId']);
    } catch (err) {}
  }
  if (!wo) {
    wo = MOCK_WORK_ORDERS.find((w) => w._id === id || w.workOrderCode === id);
  }

  if (!wo) {
    throw new ApiError(404, 'Work order report not found');
  }

  // IDOR protection: Clients can only download their own work order reports (with demo client preview support)
  if (req.user?.role === 'Client') {
    const clientId = typeof wo.clientId === 'object'
      ? (wo.clientId?._id || wo.clientId).toString()
      : String(wo.clientId);
    const isDemoClient = ['65f000000000000000000002', '65f000000000000000000003'].includes(req.user.userId);
    if (clientId !== req.user.userId && !isDemoClient) {
      throw new ApiError(403, 'Forbidden: You do not have access to this work order report');
    }
  }

  if (!isJson) {
    const pdfBuffer = await pdfService.buildReportPdfBuffer(wo);
    const filename = `${wo.workOrderCode || 'report'}_completion.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateReport(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/reports/${id}/pdf` }, 'Report generated successfully'));
};

export const getInvoice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  let invoice: any = null;
  if (mongoose.connection.readyState === 1) {
    try {
      invoice = await Invoice.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(id) ? id : null },
          { workOrderId: mongoose.isValidObjectId(id) ? id : null },
          { invoiceCode: id },
        ],
      }).populate(['clientId', 'workOrderId']);
    } catch (err) {}
  }

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  // IDOR protection: Clients can only download their own invoices
  if (req.user?.role === 'Client') {
    const clientId = typeof invoice.clientId === 'object'
      ? (invoice.clientId?._id || invoice.clientId).toString()
      : String(invoice.clientId);
    if (clientId !== req.user.userId) {
      throw new ApiError(403, 'Forbidden: You do not have access to this invoice');
    }
  }

  if (!isJson) {
    const pdfBuffer = await pdfService.buildInvoicePdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceCode || 'invoice'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateInvoice(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/reports/${id}/invoice` }, 'Invoice generated successfully'));
};
