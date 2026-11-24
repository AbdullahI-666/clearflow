export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  _id?: string;
  id?: string;
  workOrderId: string;
  clientId: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}
