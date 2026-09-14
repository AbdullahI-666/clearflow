import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

let memoryWoCounter = 5;
let memoryInvCounter = 1;

export const generateWorkOrderCode = async (): Promise<string> => {
  const year = new Date().getFullYear();

  if (mongoose.connection.readyState === 1) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: `workOrder_${year}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      if (counter && counter.seq) {
        const seqStr = String(counter.seq).padStart(4, '0');
        return `WO-${year}-${seqStr}`;
      }
    } catch (err) {
      // Fallback to in-memory counter
    }
  }

  memoryWoCounter++;
  const seqStr = String(memoryWoCounter).padStart(4, '0');
  return `WO-${year}-${seqStr}`;
};

export const generateInvoiceCode = async (): Promise<string> => {
  const year = new Date().getFullYear();

  if (mongoose.connection.readyState === 1) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: `invoice_${year}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      if (counter && counter.seq) {
        const seqStr = String(counter.seq).padStart(4, '0');
        return `INV-${year}-${seqStr}`;
      }
    } catch (err) {
      // Fallback
    }
  }

  memoryInvCounter++;
  const seqStr = String(memoryInvCounter).padStart(4, '0');
  return `INV-${year}-${seqStr}`;
};
