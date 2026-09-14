import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Invoice, IInvoice } from '../models/invoice.model.js';
import { WorkOrder } from '../models/workOrder.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { generateInvoiceCode } from '../utils/generateCode.js';
import * as pdfService from '../services/pdf.service.js';
import { MOCK_WORK_ORDERS } from '../services/workOrder.service.js';

let inMemoryInvoices: any[] = [
  {
    _id: '65f000000000000000000401',
    invoiceCode: 'INV-2026-0001',
    workOrderId: {
      _id: '65f000000000000000000204',
      workOrderCode: 'WO-2026-0004',
      locationAddress: 'Faculty Lounge, 4th Floor, Academic Block, Central Facility Complex',
      description: 'Weekly carpet shampoo and window cleaning completed.',
    },
    clientId: {
      _id: '65f000000000000000000002',
      name: 'James Chen',
      email: 'james@clearflow.com',
    },
    amount: 120,
    subtotal: 100,
    tax: 20,
    currency: 'USD',
    status: 'Paid',
    items: [
      { description: 'Deep carpet shampoo service', quantity: 1, unitPrice: 75, total: 75 },
      { description: 'Window cleaning & sanitization', quantity: 1, unitPrice: 25, total: 25 },
    ],
    issuedAt: new Date(Date.now() - 72000 * 1000),
    paidAt: new Date(Date.now() - 36000 * 1000),
  },
];

export const getAll = async (req: Request, res: Response) => {
  const { status, clientId, page = 1, limit = 20 } = req.query;

  if (mongoose.connection.readyState === 1) {
    try {
      const filters: any = {};
      if (status) filters.status = status;
      if (clientId) filters.clientId = clientId;

      const skip = (Number(page) - 1) * Number(limit);
      const invoices = await Invoice.find(filters)
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('clientId workOrderId');

      const total = await Invoice.countDocuments(filters);
      return res.json(ApiResponse.paginated(invoices, Number(page), Number(limit), total, 'Invoices retrieved successfully'));
    } catch (err) {}
  }

  let list = [...inMemoryInvoices];
  if (status) list = list.filter((i) => i.status === status);
  if (clientId) list = list.filter((i) => (i.clientId?._id || i.clientId) === clientId);

  res.json(ApiResponse.paginated(list, 1, 20, list.length, 'Invoices retrieved successfully'));
};

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (mongoose.connection.readyState === 1) {
    try {
      const invoice = await Invoice.findById(id).populate('clientId workOrderId');
      if (invoice) {
        return res.json(ApiResponse.success(invoice, 'Invoice retrieved successfully'));
      }
    } catch (err) {}
  }

  const match = inMemoryInvoices.find((i) => i._id === id || i.invoiceCode === id);
  if (match) {
    return res.json(ApiResponse.success(match, 'Invoice retrieved successfully'));
  }

  throw new ApiError(404, 'Invoice not found');
};

export const create = async (req: Request, res: Response) => {
  const { workOrderId, clientId, items, amount, currency = 'USD' } = req.body;

  if (!workOrderId) {
    throw new ApiError(400, 'Work order ID is required');
  }

  const invoiceCode = await generateInvoiceCode();

  // Find work order for reference
  let wo: any = null;
  let clientRef: any = clientId;

  if (mongoose.connection.readyState === 1) {
    try {
      wo = await WorkOrder.findById(workOrderId).populate('clientId');
      if (wo && !clientRef) {
        clientRef = wo.clientId?._id || wo.clientId;
      }
    } catch (err) {}
  }

  if (!wo) {
    wo = MOCK_WORK_ORDERS.find((w) => w._id === workOrderId || w.workOrderCode === workOrderId);
    if (wo && !clientRef) {
      clientRef = wo.clientId?._id || wo.clientId;
    }
  }

  const defaultItems = items && items.length > 0 ? items : [
    { description: `Facility Service: ${wo?.description || 'Work Order Delivery'}`, quantity: 1, unitPrice: amount || 85, total: amount || 85 }
  ];

  const subtotal = defaultItems.reduce((acc: number, item: any) => acc + (item.total || item.unitPrice * item.quantity), 0);
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const totalAmount = amount || (subtotal + tax);

  const newInvoice = {
    _id: '65f000000000000000000' + Math.floor(Math.random() * 899 + 100),
    invoiceCode,
    workOrderId: wo || workOrderId,
    clientId: clientRef || { _id: '65f000000000000000000002', name: 'James Chen', email: 'james@clearflow.com' },
    amount: totalAmount,
    subtotal,
    tax,
    currency,
    status: 'Issued' as const,
    items: defaultItems,
    issuedAt: new Date(),
  };

  inMemoryInvoices.unshift(newInvoice);

  if (mongoose.connection.readyState === 1) {
    try {
      const created = await Invoice.create({
        workOrderId,
        clientId: clientRef || new mongoose.Types.ObjectId('65f000000000000000000002'),
        invoiceCode,
        amount: totalAmount,
        subtotal,
        tax,
        currency,
        status: 'Issued',
        items: defaultItems,
        issuedAt: new Date(),
      });
      return res.status(201).json(ApiResponse.created(created, 'Invoice generated successfully'));
    } catch (err) {}
  }

  res.status(201).json(ApiResponse.created(newInvoice, 'Invoice generated successfully'));
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Issued', 'Paid', 'Cancelled'].includes(status)) {
    throw new ApiError(400, 'Invalid invoice status');
  }

  const updates: any = { status };
  if (status === 'Paid') updates.paidAt = new Date();

  const match = inMemoryInvoices.find((i) => i._id === id || i.invoiceCode === id);
  if (match) {
    Object.assign(match, updates);
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const updated = await Invoice.findByIdAndUpdate(id, updates, { new: true }).populate('clientId workOrderId');
      if (updated) {
        return res.json(ApiResponse.success(updated, 'Invoice status updated successfully'));
      }
    } catch (err) {}
  }

  res.json(ApiResponse.success(match || inMemoryInvoices[0], 'Invoice status updated successfully'));
};

export const getInvoicePdf = async (req: Request, res: Response) => {
  const { id } = req.params;
  const isJson = req.query.format === 'json';

  if (!isJson) {
    let invoice: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        invoice = await Invoice.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { invoiceCode: id }] }).populate('clientId workOrderId');
      } catch (err) {}
    }
    if (!invoice) {
      invoice = inMemoryInvoices.find((i) => i._id === id || i.invoiceCode === id) || inMemoryInvoices[0];
    }

    const pdfBuffer = await pdfService.buildInvoicePdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceCode || 'invoice'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  const url = await pdfService.generateInvoice(id as string);
  res.json(ApiResponse.success({ url, downloadUrl: `/api/invoices/${id}/pdf` }, 'Invoice PDF ready'));
};
