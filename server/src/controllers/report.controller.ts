import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as pdfService from '../services/pdf.service.js';
import { WorkOrder } from '../models/workOrder.model.js';
import { Invoice } from '../models/invoice.model.js';
import { MOCK_WORK_ORDERS } from '../services/workOrder.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  if (!isJson) {
    let wo: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        wo = await WorkOrder.findById(id).populate(['clientId', 'teamId', 'categoryId']);
      } catch (err) {}
    }
    if (!wo) {
      wo = MOCK_WORK_ORDERS.find((w) => w._id === id || w.workOrderCode === id) || MOCK_WORK_ORDERS[0];
    }

    const pdfBuffer = await pdfService.buildReportPdfBuffer(wo);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${wo.workOrderCode || 'report'}_completion.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateReport(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/reports/${id}/pdf` }, 'Report generated successfully'));
};

export const getInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  if (!isJson) {
    let invoice: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        invoice = await Invoice.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { workOrderId: mongoose.isValidObjectId(id) ? id : null }, { invoiceCode: id }] }).populate(['clientId', 'workOrderId']);
      } catch (err) {}
    }

    if (!invoice) {
      invoice = {
        invoiceCode: 'INV-2026-0001',
        amount: 115,
        subtotal: 100,
        tax: 15,
        currency: 'USD',
        status: 'Issued',
        issuedAt: new Date(),
        clientId: { name: 'Commercial Facility Client', email: 'client@clearflow.com' },
        items: [
          { description: 'Facility Maintenance & Technical Support', quantity: 1, unitPrice: 100, total: 100 },
        ],
      };
    }

    const pdfBuffer = await pdfService.buildInvoicePdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceCode || 'invoice'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateInvoice(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/reports/${id}/invoice` }, 'Invoice generated successfully'));
};
