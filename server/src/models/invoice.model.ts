import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  workOrderId: Types.ObjectId;
  clientId: Types.ObjectId;
  invoiceCode: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  currency: string;
  status: 'Issued' | 'Paid' | 'Cancelled';
  items?: IInvoiceItem[];
  pdfUrl?: string;
  issuedAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>(
  {
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceCode: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    subtotal: { type: Number },
    tax: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['Issued', 'Paid', 'Cancelled'], default: 'Issued' },
    items: [invoiceItemSchema],
    pdfUrl: { type: String },
    issuedAt: { type: Date, required: true, default: Date.now },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ workOrderId: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
