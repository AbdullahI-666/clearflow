import { dbQuery } from '../config/db.js';

let memoryWoCounter = 10;
let memoryInvCounter = 10;

export const generateWorkOrderCode = async (): Promise<string> => {
  const year = new Date().getFullYear();

  const rows = await dbQuery(
    `SELECT count(*) as cnt FROM work_orders WHERE work_order_code LIKE $1`,
    [`WO-${year}-%`]
  );
  if (rows && rows.length > 0) {
    const count = Math.max(parseInt(rows[0].cnt, 10), 10) + (memoryWoCounter - 10);
    memoryWoCounter++;
    const seqStr = String(count + 1).padStart(4, '0');
    return `WO-${year}-${seqStr}`;
  }

  memoryWoCounter++;
  const seqStr = String(memoryWoCounter).padStart(4, '0');
  return `WO-${year}-${seqStr}`;
};

export const generateInvoiceCode = async (): Promise<string> => {
  const year = new Date().getFullYear();

  const rows = await dbQuery(
    `SELECT count(*) as cnt FROM invoices WHERE invoice_code LIKE $1`,
    [`INV-${year}-%`]
  );
  if (rows && rows.length > 0) {
    const count = parseInt(rows[0].cnt, 10) + memoryInvCounter;
    memoryInvCounter++;
    const seqStr = String(count).padStart(4, '0');
    return `INV-${year}-${seqStr}`;
  }

  memoryInvCounter++;
  const seqStr = String(memoryInvCounter).padStart(4, '0');
  return `INV-${year}-${seqStr}`;
};
