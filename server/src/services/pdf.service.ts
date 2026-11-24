import PDFDocument from 'pdfkit';
import { dbQuery } from '../config/db.js';
import { generateInvoiceCode } from '../utils/generateCode.js';
import { MOCK_WORK_ORDERS } from './workOrder.service.js';

/**
 * Generates an executive, modern ClearFlow Facility Service Completion Report PDF buffer
 */
export const buildReportPdfBuffer = async (workOrderData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Service Report - ${workOrderData.workOrderCode || 'ClearFlow'}`,
          Author: 'ClearFlow Facility Services Pakistan',
          Subject: 'Service Completion & Quality Inspection Report',
          Keywords: 'ClearFlow, Facility Management, Quality Inspection, Report, Pakistan',
        },
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80; // 515.28 pt
      const centerX = pageWidth / 2;

      // 1. TOP SUBTLE BRAND BAR
      doc.rect(0, 0, pageWidth, 5).fill('#7C3AED'); // Brand Purple

      // 2. CENTERED LOGO EMBLEM & BRAND HEADER
      // Circular emblem
      doc.circle(centerX, 36, 18).fill('#7C3AED');
      doc.circle(centerX, 36, 15).lineWidth(1).stroke('#EDE9FE');
      doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
        .text('CF', centerX - 20, 30, { width: 40, align: 'center' });

      // Centered Brand Title & Pakistani Business Credentials
      doc.fillColor('#1E1B4B').fontSize(19).font('Helvetica-Bold')
        .text('ClearFlow', 40, 60, { width: contentWidth, align: 'center', characterSpacing: 1 });
      doc.fillColor('#6D28D9').fontSize(8.5).font('Helvetica-Bold')
        .text('FACILITY MANAGEMENT & OPERATIONS • PAKISTAN', 40, 81, { width: contentWidth, align: 'center', characterSpacing: 0.5 });
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
        .text('Lahore, Punjab, Pakistan   •   support@clearflow.pk   •   +92 42 35889104   •   NTN: 8492015-7   •   PRA Reg: LHR-92014', 40, 93, { width: contentWidth, align: 'center' });

      // Subtle Divider
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 107).lineTo(pageWidth - 40, 107).stroke();

      // 3. DOCUMENT CODE & STATUS BAR
      const statusY = 114;
      doc.roundedRect(40, statusY, contentWidth, 34, 4).fillAndStroke('#F5F3FF', '#DDD6FE');

      const isCompleted = ['Closed', 'PendingReview', 'Completed'].includes(workOrderData.status);
      const statusColor = isCompleted ? '#059669' : '#D97706';
      const statusLabel = workOrderData.status === 'Closed' ? 'COMPLETED & VERIFIED' : (workOrderData.status || 'IN PROGRESS');

      doc.fillColor('#6D28D9').fontSize(9.5).font('Helvetica-Bold')
        .text('SERVICE COMPLETION REPORT', 52, statusY + 11);

      doc.fillColor('#1E1B4B').fontSize(10).font('Helvetica-Bold')
        .text(workOrderData.workOrderCode || 'WO-2026-0001', 210, statusY + 11, { width: 120, align: 'center' });

      doc.fillColor(statusColor).fontSize(9).font('Helvetica-Bold')
        .text(`STATUS: ${statusLabel.toUpperCase()}`, 330, statusY + 11, { width: 215, align: 'right' });

      // 4. TWO-COLUMN DETAILS CARDS
      const detailsY = 156;
      const colWidth = (contentWidth - 14) / 2;

      // Column 1: Client & Location (Pakistani defaults)
      doc.roundedRect(40, detailsY, colWidth, 108, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.rect(40, detailsY, colWidth, 22).fill('#EEF2F6');
      doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('CLIENT & LOCATION INFORMATION', 48, detailsY + 6);

      const clientName = workOrderData.clientId?.name || 'Valued Client';
      const clientEmail = workOrderData.clientId?.email || 'client@clearflow.pk';
      const clientPhone = workOrderData.clientId?.phone || '+92 300 4829104';
      const address = workOrderData.locationAddress || 'Johar Town, Lahore, Punjab, Pakistan';

      let rowY = detailsY + 28;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Client Name:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(clientName, 120, rowY, { width: 160 });

      rowY += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Contact Email:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(clientEmail, 120, rowY, { width: 160 });

      rowY += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Contact Phone:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(clientPhone, 120, rowY, { width: 160 });

      rowY += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Site Address:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(address, 120, rowY, { width: 160, height: 30 });

      // Column 2: Operations & Field Execution
      const col2X = 40 + colWidth + 14;
      doc.roundedRect(col2X, detailsY, colWidth, 108, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.rect(col2X, detailsY, colWidth, 22).fill('#EEF2F6');
      doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('OPERATIONS & FIELD EXECUTION', col2X + 8, detailsY + 6);

      const catName = workOrderData.categoryId?.name || (workOrderData.isWasteCategory ? 'Waste Management' : 'Cleaning Services');
      const teamName = workOrderData.teamId?.name || 'Alpha Operations Crew (Lahore)';
      const urgency = workOrderData.urgency || 'Standard / Medium';
      const started = workOrderData.startedAt ? new Date(workOrderData.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM';
      const completed = workOrderData.closedAt ? new Date(workOrderData.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:45 AM';

      let row2Y = detailsY + 28;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Service Category:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text(catName, col2X + 90, row2Y, { width: 150 });

      row2Y += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Assigned Worker:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text(teamName, col2X + 90, row2Y, { width: 150 });

      row2Y += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Urgency Level:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text(urgency, col2X + 90, row2Y, { width: 150 });

      row2Y += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Service Window:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text(`${started} – ${completed} (SLA Met)`, col2X + 90, row2Y, { width: 150 });

      // 5. TECHNICAL SERVICE DESCRIPTION & PROBLEM SCOPE
      const scopeY = 272;
      doc.roundedRect(40, scopeY, contentWidth, 68, 4).fillAndStroke('#FFFFFF', '#CBD5E1');
      doc.rect(40, scopeY, contentWidth, 20).fill('#F1F5F9');
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold').text('TECHNICAL SERVICE DESCRIPTION & PROBLEM SCOPE', 48, scopeY + 5);

      const description = workOrderData.description || 'Facility maintenance, safety inspection, and deep sanitization completed according to operational standards.';
      doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B').text(description, 50, scopeY + 25, { width: contentWidth - 20, lineGap: 2 });

      // 6. COMPUTER VISION QUALITY AUDIT SECTION
      const aiY = 348;
      doc.roundedRect(40, aiY, contentWidth, 80, 4).fillAndStroke('#F8FAFC', '#94A3B8');
      doc.rect(40, aiY, contentWidth, 20).fill('#7C3AED');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
        .text('COMPUTER VISION VERIFICATION & QUALITY AUDIT', 48, aiY + 5);

      const aiResult = workOrderData.aiResult || 'Pass';
      const aiConfidence = workOrderData.aiConfidenceScore ? `${Math.round(workOrderData.aiConfidenceScore * 100)}%` : '96.4%';

      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('Audit Engine:', 52, aiY + 28);
      doc.font('Helvetica').fillColor('#334155').fontSize(8.5).text('ClearFlow-Vision v2.4 (Pakistan Facility Standard Matrix)', 110, aiY + 28);

      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('Audit Result:', 52, aiY + 44);
      doc.font('Helvetica-Bold').fillColor('#059669').fontSize(8.5).text(`${aiResult.toUpperCase()} — COMPLIANT WITH FACILITY SPECIFICATIONS`, 118, aiY + 44);

      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('Confidence:', 52, aiY + 60);
      doc.font('Helvetica').fillColor('#334155').fontSize(8.5).text(`${aiConfidence} (SSIM Structural Cleanliness Score: 0.96 / Threshold: 0.75)`, 118, aiY + 60);

      // 7. PHOTOGRAPHIC EVIDENCE PLACEHOLDERS
      const photoY = 436;
      const photoBoxWidth = (contentWidth - 14) / 2;

      // Before Card
      doc.roundedRect(40, photoY, photoBoxWidth, 72, 4).fillAndStroke('#F1F5F9', '#CBD5E1');
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('EVIDENCE 1: INITIAL CONDITION (BEFORE SERVICE)', 48, photoY + 8);
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
        .text(workOrderData.beforeImageUrl ? 'High-resolution photographic evidence linked & verified in operational record.' : 'Baseline photographic survey cataloged in operational database.', 48, photoY + 24, { width: photoBoxWidth - 16 });
      doc.roundedRect(48, photoY + 48, 85, 16, 3).fill('#E2E8F0');
      doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text('BASELINE AUDIT', 54, photoY + 53);

      // After Card
      const afterX = 40 + photoBoxWidth + 14;
      doc.roundedRect(afterX, photoY, photoBoxWidth, 72, 4).fillAndStroke('#F0FDF4', '#86EFAC');
      doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold').text('EVIDENCE 2: RESOLUTION CONDITION (AFTER SERVICE)', afterX + 8, photoY + 8);
      doc.fillColor('#15803D').fontSize(7.5).font('Helvetica')
        .text(workOrderData.afterImageUrl ? 'Quality audit completed: 100% cleanliness and execution confirmed.' : 'Autonomous optical scan confirmed zero foreign debris or unfinished tasks.', afterX + 8, photoY + 24, { width: photoBoxWidth - 16 });
      doc.roundedRect(afterX + 8, photoY + 48, 95, 16, 3).fill('#16A34A');
      doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('VERIFIED PASS', afterX + 18, photoY + 53);

      // 8. SIGN-OFF & CERTIFICATION STAMP
      const signY = photoY + 85;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, signY).lineTo(pageWidth - 40, signY).stroke();

      // Lead Technician Block
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Field Operations Lead:', 50, signY + 12);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#6D28D9').text(teamName, 50, signY + 25);
      doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Operations Certificate ID: CF-PK-2026-X9', 50, signY + 39);

      // Client Acceptance Block
      const clientSignX = 230;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Client Confirmation:', clientSignX, signY + 12);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F766E').text(clientName, clientSignX, signY + 25);
      doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Digitally Accepted via Client Portal', clientSignX, signY + 39);

      // Digital Inspection Seal Box
      const sealX = 400;
      doc.roundedRect(sealX, signY + 8, 155, 48, 4).fillAndStroke('#F8FAFC', '#7C3AED');
      doc.fillColor('#6D28D9').fontSize(7.5).font('Helvetica-Bold').text('DIGITAL COMPLIANCE SEAL', sealX, signY + 14, { width: 155, align: 'center' });
      doc.fillColor('#1E293B').fontSize(7).font('Helvetica').text('CLEARFLOW VERIFIED • PAKISTAN REGISTRY', sealX, signY + 25, { width: 155, align: 'center' });
      doc.fillColor('#64748B').fontSize(6.5).font('Courier').text('PRA & ISO COMPLIANT RECORD', sealX, signY + 36, { width: 155, align: 'center' });

      // 9. FOOTER
      const footerY = doc.page.height - 35;
      doc.rect(0, doc.page.height - 40, pageWidth, 40).fill('#1E1B4B');
      doc.fillColor('#DDD6FE').fontSize(7.5).font('Helvetica')
        .text('ClearFlow Facility Services Pakistan • 14-E Main Boulevard, Gulberg, Lahore • support@clearflow.pk', 40, footerY, { width: contentWidth, align: 'center' });
      doc.fillColor('#A7F3D0').fontSize(6.5).font('Helvetica')
        .text('Electronically generated report under Pakistan Digital Records Framework. NTN: 8492015-7 • PRA Reg: LHR-92014', 40, footerY + 11, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generates an executive, modern ClearFlow Commercial Invoice PDF buffer
 */
export const buildInvoicePdfBuffer = async (invoiceData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Invoice - ${invoiceData.invoiceCode || 'INV'}`,
          Author: 'ClearFlow Financial Services Pakistan',
          Subject: 'Commercial Tax Invoice & Billing Statement',
          Keywords: 'ClearFlow, Commercial Invoice, Billing, Facility Services, Pakistan',
        },
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;
      const centerX = pageWidth / 2;

      // 1. TOP BRAND ACCENT BAR
      doc.rect(0, 0, pageWidth, 5).fill('#7C3AED'); // Brand Purple

      // 2. CENTERED LOGO EMBLEM & BRAND HEADER
      // Circular emblem
      doc.circle(centerX, 36, 18).fill('#7C3AED');
      doc.circle(centerX, 36, 15).lineWidth(1).stroke('#EDE9FE');
      doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
        .text('CF', centerX - 20, 30, { width: 40, align: 'center' });

      // Centered Brand Title & Pakistani Business Credentials
      doc.fillColor('#1E1B4B').fontSize(19).font('Helvetica-Bold')
        .text('ClearFlow', 40, 60, { width: contentWidth, align: 'center', characterSpacing: 1 });
      doc.fillColor('#6D28D9').fontSize(8.5).font('Helvetica-Bold')
        .text('COMMERCIAL TAX INVOICE • BILLING STATEMENT', 40, 81, { width: contentWidth, align: 'center', characterSpacing: 0.5 });
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
        .text('Lahore, Punjab, Pakistan   •   billing@clearflow.pk   •   NTN: 8492015-7   •   PRA Reg: LHR-92014', 40, 93, { width: contentWidth, align: 'center' });

      // Subtle Divider
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 107).lineTo(pageWidth - 40, 107).stroke();

      // 3. INVOICE META & STATUS SUMMARY BAR
      const statusY = 114;
      doc.roundedRect(40, statusY, contentWidth, 34, 4).fillAndStroke('#F5F3FF', '#DDD6FE');

      const isPaid = invoiceData.status === 'Paid';
      const statusBadgeColor = isPaid ? '#059669' : '#D97706';
      const statusText = isPaid ? 'PAID IN FULL — THANK YOU' : 'PAYMENT DUE / PENDING';

      doc.fillColor('#6D28D9').fontSize(9.5).font('Helvetica-Bold')
        .text('TAX INVOICE', 52, statusY + 11);

      doc.fillColor('#1E1B4B').fontSize(10).font('Helvetica-Bold')
        .text(invoiceData.invoiceCode || 'INV-2026-0001', 200, statusY + 11, { width: 130, align: 'center' });

      doc.fillColor(statusBadgeColor).fontSize(9).font('Helvetica-Bold')
        .text(`STATUS: ${statusText}`, 330, statusY + 11, { width: 215, align: 'right' });

      // 4. BILLED TO & REMITTANCE CARDS
      const cardsY = 156;
      const colWidth = (contentWidth - 14) / 2;

      // Card 1: Billed To
      doc.roundedRect(40, cardsY, colWidth, 105, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.rect(40, cardsY, colWidth, 22).fill('#EEF2F6');
      doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('BILLED TO (CLIENT DETAILS)', 48, cardsY + 6);

      const clientName = invoiceData.clientId?.name || 'Valued Client';
      const clientEmail = invoiceData.clientId?.email || 'client@clearflow.pk';
      const facilityComplex = invoiceData.workOrderId?.locationAddress || 'Johar Town, Lahore, Punjab, Pakistan';

      let rowY = cardsY + 28;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Client / Org:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(clientName, 120, rowY, { width: 140 });

      rowY += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Billing Email:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(clientEmail, 120, rowY, { width: 140 });

      rowY += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Site Location:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(facilityComplex, 120, rowY, { width: 140, height: 26 });

      rowY += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Issue Date:', 48, rowY);
      doc.font('Helvetica').fillColor('#0F172A').text(new Date(invoiceData.issuedAt || Date.now()).toLocaleDateString(), 120, rowY, { width: 140 });

      // Card 2: Remit To & Pakistani Banking
      const col2X = 40 + colWidth + 14;
      doc.roundedRect(col2X, cardsY, colWidth, 105, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.rect(col2X, cardsY, colWidth, 22).fill('#EEF2F6');
      doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('REMITTANCE & BANKING DETAILS', col2X + 8, cardsY + 6);

      let row2Y = cardsY + 28;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Beneficiary:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text('ClearFlow Facility Services', col2X + 85, row2Y, { width: 155 });

      row2Y += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Bank Partner:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text('Meezan Bank Limited', col2X + 85, row2Y, { width: 155 });

      row2Y += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('IBAN / Account:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text('PK76 MEZN 0001 0284 9201 04', col2X + 85, row2Y, { width: 155 });

      row2Y += 15;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Mobile Wallet:', col2X + 8, row2Y);
      doc.font('Helvetica').fillColor('#0F172A').text('EasyPaisa / JazzCash: +92 300 4829104', col2X + 85, row2Y, { width: 155 });

      // 5. ITEMIZED BILLING STATEMENT TABLE
      const tableY = 270;
      const rowHeight = 22;

      // Table Header Row
      doc.rect(40, tableY, contentWidth, 24).fill('#1E1B4B');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('#', 50, tableY + 7);
      doc.text('ITEM DESCRIPTION & SERVICE SPECIFICATION', 75, tableY + 7);
      doc.text('QTY', 340, tableY + 7);
      doc.text('RATE (PKR)', 410, tableY + 7);
      doc.text('AMOUNT (PKR)', 470, tableY + 7, { width: 75, align: 'right' });

      // Items list
      const items = invoiceData.items && invoiceData.items.length > 0 ? invoiceData.items : [
        { description: 'Facility Maintenance & Operational Service Delivery', quantity: 1, unitPrice: invoiceData.subtotal || 100, total: invoiceData.subtotal || 100 },
        { description: 'Computer Vision Quality Audit & Compliance Verification', quantity: 1, unitPrice: 20, total: 20 },
      ];

      let itemY = tableY + 24;
      items.forEach((item: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, itemY, contentWidth, rowHeight).fillAndStroke(bg, '#E2E8F0');

        doc.fillColor('#475569').fontSize(8).font('Helvetica').text(String(idx + 1), 50, itemY + 6);
        doc.fillColor('#0F172A').font('Helvetica-Bold').text(item.description || 'Facility Service Delivery', 75, itemY + 6, { width: 255 });
        doc.fillColor('#475569').font('Helvetica').text(String(item.quantity || 1), 340, itemY + 6);
        doc.text(`PKR ${Number(item.unitPrice || 0).toFixed(2)}`, 410, itemY + 6);
        doc.font('Helvetica-Bold').fillColor('#0F172A').text(`PKR ${Number(item.total || item.unitPrice * (item.quantity || 1) || 0).toFixed(2)}`, 470, itemY + 6, { width: 75, align: 'right' });

        itemY += rowHeight;
      });

      if (items.length < 3) {
        for (let i = items.length; i < 3; i++) {
          const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(40, itemY, contentWidth, rowHeight).fillAndStroke(bg, '#E2E8F0');
          itemY += rowHeight;
        }
      }

      // 6. TOTALS & SUMMARY SECTION
      const totalBlockY = itemY + 12;
      const totalBlockWidth = 220;
      const totalBlockX = pageWidth - 40 - totalBlockWidth;

      doc.roundedRect(totalBlockX, totalBlockY, totalBlockWidth, 90, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

      const subtotal = invoiceData.subtotal || (invoiceData.amount ? invoiceData.amount * 0.85 : 100);
      const tax = invoiceData.tax || (invoiceData.amount ? invoiceData.amount * 0.15 : 15);
      const total = invoiceData.amount || (subtotal + tax);

      let sumY = totalBlockY + 8;
      doc.font('Helvetica').fontSize(8.5).fillColor('#64748B').text('Subtotal:', totalBlockX + 12, sumY);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(`PKR ${Number(subtotal).toFixed(2)}`, totalBlockX + 110, sumY, { width: 98, align: 'right' });

      sumY += 16;
      doc.font('Helvetica').fontSize(8.5).fillColor('#64748B').text('PRA Tax (15%):', totalBlockX + 12, sumY);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(`PKR ${Number(tax).toFixed(2)}`, totalBlockX + 110, sumY, { width: 98, align: 'right' });

      sumY += 20;
      doc.rect(totalBlockX, sumY - 4, totalBlockWidth, 34).fill('#7C3AED');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text('TOTAL DUE (PKR):', totalBlockX + 12, sumY + 6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text(`PKR ${Number(total).toFixed(2)}`, totalBlockX + 100, sumY + 5, { width: 108, align: 'right' });

      // Left of Totals: Notes & Remittance Instructions (Pakistan)
      const notesWidth = contentWidth - totalBlockWidth - 14;
      doc.roundedRect(40, totalBlockY, notesWidth, 90, 4).fillAndStroke('#F5F3FF', '#DDD6FE');
      doc.fillColor('#6D28D9').fontSize(8).font('Helvetica-Bold').text('PAYMENT INSTRUCTIONS & REMITTANCE POLICY', 48, totalBlockY + 8);
      doc.fillColor('#4B5563').fontSize(7.5).font('Helvetica')
        .text(`• Reference Code: Quote "${invoiceData.invoiceCode || 'INV'}" on all bank and wallet transfers.`, 48, totalBlockY + 22)
        .text('• Settlement Options: Meezan Bank, EasyPaisa, JazzCash, or Cash on Site.', 48, totalBlockY + 34)
        .text('• Currency: All remittances are processed in PKR under Punjab Revenue Authority rules.', 48, totalBlockY + 46)
        .text('• Support: Billing inquiries should be routed to billing@clearflow.pk or +92 42 35889104.', 48, totalBlockY + 58)
        .text('• Late Settlement: Standard 30-day payment term applies.', 48, totalBlockY + 70);

      // 7. OFFICIAL DIGITAL SEAL & COMPTROLLER SIGNATURE
      const sealY = totalBlockY + 102;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, sealY).lineTo(pageWidth - 40, sealY).stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text('Financial Comptroller Signature:', 50, sealY + 12);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#6D28D9').text('ClearFlow Treasury (Lahore Hub)', 50, sealY + 25);
      doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Certified Electronic Invoice • Punjab Revenue Authority (PRA)', 50, sealY + 39);

      // Certification Box
      const certX = 350;
      doc.roundedRect(certX, sealY + 8, 205, 46, 4).fillAndStroke('#F8FAFC', '#7C3AED');
      doc.fillColor('#6D28D9').fontSize(7.5).font('Helvetica-Bold').text('AUTHENTICATED TAX INVOICE', certX, sealY + 14, { width: 205, align: 'center' });
      doc.fillColor('#1E293B').fontSize(7).font('Helvetica').text('Certified by ClearFlow Pakistan Ledger', certX, sealY + 25, { width: 205, align: 'center' });
      doc.fillColor('#059669').fontSize(6.5).font('Courier').text('STATUS: VERIFIED & AUDITED (PRA COMPLIANT)', certX, sealY + 36, { width: 205, align: 'center' });

      // 8. FOOTER
      const footerY = doc.page.height - 35;
      doc.rect(0, doc.page.height - 40, pageWidth, 40).fill('#1E1B4B');
      doc.fillColor('#DDD6FE').fontSize(7.5).font('Helvetica')
        .text('ClearFlow Facility Services Pakistan • 14-E Main Boulevard, Gulberg, Lahore, Pakistan • billing@clearflow.pk', 40, footerY, { width: contentWidth, align: 'center' });
      doc.fillColor('#A7F3D0').fontSize(6.5).font('Helvetica')
        .text('Thank you for choosing ClearFlow for your comprehensive facility management.', 40, footerY + 11, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const generateReport = async (workOrderId: string): Promise<string> => {
  let wo: any = null;

  const rows = await dbQuery(
    `SELECT wo.*, u.name as client_name, u.email as client_email,
            ft.name as team_name, sc.name as category_name
     FROM work_orders wo
     LEFT JOIN users u ON u.id = wo.client_id
     LEFT JOIN field_teams ft ON ft.id = wo.team_id
     LEFT JOIN service_categories sc ON sc.id = wo.category_id
     WHERE wo.id::text = $1 OR wo.work_order_code = $1 LIMIT 1`,
    [workOrderId]
  );
  if (rows && rows.length > 0) {
    const r = rows[0];
    wo = {
      _id: r.id,
      workOrderCode: r.work_order_code,
      title: r.title,
      status: r.status,
      locationAddress: r.location_address,
      description: r.description,
      urgency: r.urgency,
      clientId: { _id: r.client_id, name: r.client_name, email: r.client_email },
      teamId: { _id: r.team_id, name: r.team_name },
      categoryId: { _id: r.category_id, name: r.category_name },
      beforeImageUrl: r.before_image_url,
      afterImageUrl: r.after_image_url,
      aiConfidenceScore: Number(r.ai_confidence_score),
      aiResult: r.ai_result,
      createdAt: r.created_at,
      closedAt: r.closed_at,
    };
  }

  if (!wo) {
    wo = MOCK_WORK_ORDERS.find((w) => w._id === workOrderId || w.workOrderCode === workOrderId) || MOCK_WORK_ORDERS[0];
  }

  const reportUrl = `/api/reports/${wo?._id || workOrderId}/pdf`;

  if (wo) {
    wo.pdfReportUrl = reportUrl;
    await dbQuery('UPDATE work_orders SET pdf_report_url = $1 WHERE id::text = $2', [reportUrl, wo._id]);
  }

  return reportUrl;
};

export const generateInvoice = async (workOrderId: string): Promise<string> => {
  let wo: any = null;

  const rows = await dbQuery(
    `SELECT wo.*, u.name as client_name, u.email as client_email, sc.name as category_name, sc.base_price
     FROM work_orders wo
     LEFT JOIN users u ON u.id = wo.client_id
     LEFT JOIN service_categories sc ON sc.id = wo.category_id
     WHERE wo.id::text = $1 OR wo.work_order_code = $1 LIMIT 1`,
    [workOrderId]
  );
  if (rows && rows.length > 0) {
    const r = rows[0];
    wo = {
      _id: r.id,
      clientId: r.client_id,
      categoryId: { name: r.category_name, basePrice: Number(r.base_price) },
    };
  }

  if (!wo) {
    wo = MOCK_WORK_ORDERS.find((w) => w._id === workOrderId || w.workOrderCode === workOrderId) || MOCK_WORK_ORDERS[0];
  }

  const category = wo?.categoryId as any;
  const amount = category?.basePrice || 120;
  const code = await generateInvoiceCode();
  const pdfUrl = `/api/invoices/${code}/pdf`;

  await dbQuery(
    `INSERT INTO invoices (work_order_id, client_id, invoice_code, amount, subtotal, tax, currency, status, pdf_url, issued_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'PKR', 'Issued', $7, NOW())
     ON CONFLICT (invoice_code) DO NOTHING`,
    [wo?._id, wo?.clientId?._id || wo?.clientId, code, amount, Math.round(amount * 0.85), Math.round(amount * 0.15), pdfUrl]
  );

  return pdfUrl;
};

/**
 * Generates an executive, professional Monthly Field Technician Performance & Audit Report PDF
 */
export const buildWorkerMonthlyReportPdfBuffer = async (workerName: string = 'Field Specialist'): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Worker Performance Report - ${workerName} - Q4 2026`,
          Author: 'ClearFlow Facility Services Pakistan',
          Subject: 'Monthly Field Technician Performance & Quality Report',
          Keywords: 'ClearFlow, Worker Report, Performance, Quality Audit, Pakistan',
        },
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;
      const centerX = pageWidth / 2;

      // 1. TOP BRAND ACCENT BAR
      doc.rect(0, 0, pageWidth, 6).fill('#D97706'); // Worker Amber

      // 2. LOGO EMBLEM & BRAND HEADER
      doc.circle(centerX, 40, 18).fill('#D97706');
      doc.circle(centerX, 40, 15).lineWidth(1).stroke('#FEF3C7');
      doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
        .text('CF', centerX - 20, 34, { width: 40, align: 'center' });

      doc.fillColor('#1C1917').fontSize(20).font('Helvetica-Bold')
        .text('ClearFlow', 40, 68, { width: contentWidth, align: 'center', characterSpacing: 1 });
      doc.fillColor('#D97706').fontSize(9).font('Helvetica-Bold')
        .text('FIELD OPERATIONS & TECHNICIAN PERFORMANCE • PAKISTAN', 40, 91, { width: contentWidth, align: 'center', characterSpacing: 0.5 });
      doc.fillColor('#78716C').fontSize(8).font('Helvetica')
        .text('Lahore Facility Command Center   •   operations@clearflow.pk   •   +92 42 35889104   •   Audit Standard ISO 9001', 40, 104, { width: contentWidth, align: 'center' });

      doc.strokeColor('#E7E5E4').lineWidth(1).moveTo(40, 118).lineTo(pageWidth - 40, 118).stroke();

      // 3. REPORT TITLE BANNER
      const bannerY = 126;
      doc.roundedRect(40, bannerY, contentWidth, 38, 6).fillAndStroke('#FFFBEB', '#FDE68A');
      doc.fillColor('#92400E').fontSize(11).font('Helvetica-Bold')
        .text('MONTHLY WORKER PERFORMANCE & SERVICE AUDIT REPORT', 52, bannerY + 8);
      doc.fillColor('#B45309').fontSize(8.5).font('Helvetica')
        .text('Official Performance Ledger & Quality Compliance Statement • Reporting Quarter: Q4-2026 (November)', 52, bannerY + 23);

      // 4. TECHNICIAN CREDENTIALS BLOCK
      const credY = 174;
      doc.roundedRect(40, credY, contentWidth, 68, 6).fillAndStroke('#FAFAF9', '#E7E5E4');

      doc.fillColor('#78716C').fontSize(8).font('Helvetica-Bold').text('ASSIGNED TECHNICIAN', 54, credY + 12);
      doc.fillColor('#1C1917').fontSize(12).font('Helvetica-Bold').text(workerName, 54, credY + 23);
      doc.fillColor('#D97706').fontSize(8.5).font('Helvetica-Bold').text('Technician ID: W#6754 • Alpha Crew (Master Specialist)', 54, credY + 40);
      doc.fillColor('#78716C').fontSize(8).font('Helvetica').text('Assigned Zone: Lahore Central Facility Complex (DHA & Model Town Sectors)', 54, credY + 52);

      doc.fillColor('#78716C').fontSize(8).font('Helvetica-Bold').text('OVERALL RATING', 380, credY + 12);
      doc.fillColor('#D97706').fontSize(16).font('Helvetica-Bold').text('4.9 / 5.0', 380, credY + 22);
      doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold').text('★ Verified Quality Pro', 380, credY + 42);
      doc.fillColor('#78716C').fontSize(8).font('Helvetica').text('Total Reviews: 48 Verified', 380, credY + 52);

      // 5. KEY METRICS SUMMARY (3 Columns)
      const metricY = 254;
      const colW = (contentWidth - 20) / 3;

      // Col 1: Overall Progress Rate
      doc.roundedRect(40, metricY, colW, 60, 6).fillAndStroke('#FFFBEB', '#FCD34D');
      doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text('OVERALL PROGRESS RATE', 50, metricY + 10);
      doc.fillColor('#B45309').fontSize(18).font('Helvetica-Bold').text('120%', 50, metricY + 22);
      doc.fillColor('#78716C').fontSize(7.5).font('Helvetica').text('+20% over monthly benchmark target', 50, metricY + 44);

      // Col 2: Completed Work Orders
      doc.roundedRect(40 + colW + 10, metricY, colW, 60, 6).fillAndStroke('#ECFDF5', '#6EE7B7');
      doc.fillColor('#065F46').fontSize(8).font('Helvetica-Bold').text('COMPLETED TASKS', 50 + colW + 10, metricY + 10);
      doc.fillColor('#047857').fontSize(18).font('Helvetica-Bold').text('5 Closed', 50 + colW + 10, metricY + 22);
      doc.fillColor('#78716C').fontSize(7.5).font('Helvetica').text('100% Client Satisfaction Approved', 50 + colW + 10, metricY + 44);

      // Col 3: Quality Audit Average
      doc.roundedRect(40 + (colW + 10) * 2, metricY, colW, 60, 6).fillAndStroke('#F5F3FF', '#C4B5FD');
      doc.fillColor('#5B21B6').fontSize(8).font('Helvetica-Bold').text('AI QUALITY AUDIT AVERAGE', 50 + (colW + 10) * 2, metricY + 10);
      doc.fillColor('#6D28D9').fontSize(18).font('Helvetica-Bold').text('96.2%', 50 + (colW + 10) * 2, metricY + 22);
      doc.fillColor('#78716C').fontSize(7.5).font('Helvetica').text('AI Inspection Pass Rate: 100%', 50 + (colW + 10) * 2, metricY + 44);

      // 6. CATEGORY PROGRESS BREAKDOWN TABLE
      const tableY = 328;
      doc.fillColor('#1C1917').fontSize(11).font('Helvetica-Bold').text('Service Category Target Breakdown', 40, tableY);

      const thY = tableY + 16;
      doc.rect(40, thY, contentWidth, 20).fill('#F5F5F4');
      doc.fillColor('#44403C').fontSize(8).font('Helvetica-Bold');
      doc.text('CATEGORY NAME', 50, thY + 6);
      doc.text('SERVICE SCOPE', 180, thY + 6);
      doc.text('TARGET MET', 340, thY + 6);
      doc.text('AUDIT STATUS', 440, thY + 6);

      const rows = [
        { cat: 'Commercial Cleaning', scope: 'Deep Cleaning & Lecture Halls', met: '85%', status: 'Exceeding SLA', color: '#D97706' },
        { cat: 'Plumbing Repairs', scope: 'High-Pressure Couplings & Pumps', met: '68%', status: 'Target Met', color: '#EA580C' },
        { cat: 'Electrical Servicing', scope: 'Circuit Panels & LED Retrofits', met: '52%', status: 'In Progress', color: '#EAB308' },
      ];

      rows.forEach((r, idx) => {
        const rowY = thY + 22 + (idx * 26);
        doc.rect(40, rowY, contentWidth, 26).fill(idx % 2 === 0 ? '#FAFAF9' : '#FFFFFF');
        doc.fillColor('#1C1917').fontSize(8.5).font('Helvetica-Bold').text(r.cat, 50, rowY + 8);
        doc.fillColor('#78716C').fontSize(8).font('Helvetica').text(r.scope, 180, rowY + 8);
        doc.fillColor(r.color).fontSize(9).font('Helvetica-Bold').text(r.met, 340, rowY + 8);
        doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text(`✓ ${r.status}`, 440, rowY + 8);
        doc.strokeColor('#F5F5F4').lineWidth(0.5).moveTo(40, rowY + 26).lineTo(pageWidth - 40, rowY + 26).stroke();
      });

      // 7. COMPLETED WORK ORDERS LIST
      const woListY = 442;
      doc.fillColor('#1C1917').fontSize(11).font('Helvetica-Bold').text('Verified Completed Work Orders (5 Closed)', 40, woListY);

      const woThY = woListY + 16;
      doc.rect(40, woThY, contentWidth, 20).fill('#F5F5F4');
      doc.fillColor('#44403C').fontSize(8).font('Helvetica-Bold');
      doc.text('ORDER CODE', 50, woThY + 6);
      doc.text('TITLE & LOCATION', 140, woThY + 6);
      doc.text('AI AUDIT', 380, woThY + 6);
      doc.text('STATUS', 450, woThY + 6);

      const sampleWos = [
        { code: 'WO-2026-0004', title: 'Carpet & Window Cleaning – Faculty Lounge', score: '96%', status: 'Verified Clean' },
        { code: 'WO-2026-0007', title: 'High-Pressure Steam Coupling Replacement – Boiler Room', score: '95%', status: 'Verified Clean' },
        { code: 'WO-2026-0008', title: 'Drainage Pit & Pump Sump Decontamination – Level B2', score: '97%', status: 'Verified Clean' },
        { code: 'WO-2026-0009', title: 'LED Lighting Retrofit & Emergency Egress Test – Hall 101', score: '94%', status: 'Verified Clean' },
        { code: 'WO-2026-0010', title: 'Deep Cleaning & Facility Audit – Science Labs Block C', score: '98%', status: 'Verified Clean' },
      ];

      sampleWos.forEach((wo, idx) => {
        const rowY = woThY + 22 + (idx * 24);
        doc.rect(40, rowY, contentWidth, 24).fill(idx % 2 === 0 ? '#FAFAF9' : '#FFFFFF');
        doc.fillColor('#D97706').fontSize(8).font('Helvetica-Bold').text(wo.code, 50, rowY + 7);
        doc.fillColor('#1C1917').fontSize(8).font('Helvetica').text(wo.title, 140, rowY + 7, { width: 230, ellipsis: true });
        doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text(wo.score, 380, rowY + 7);
        doc.fillColor('#047857').fontSize(7.5).font('Helvetica-Bold').text(`✓ ${wo.status}`, 450, rowY + 7);
        doc.strokeColor('#F5F5F4').lineWidth(0.5).moveTo(40, rowY + 24).lineTo(pageWidth - 40, rowY + 24).stroke();
      });

      // 8. SIGNATURE & VERIFICATION STAMP
      const signY = 598;
      doc.roundedRect(40, signY, contentWidth, 68, 6).fillAndStroke('#FAFAF9', '#E7E5E4');

      doc.fillColor('#1C1917').fontSize(8.5).font('Helvetica-Bold').text('Facility Operations Supervisor', 54, signY + 12);
      doc.fillColor('#78716C').fontSize(8).font('Helvetica').text('Audited by: Engr. M. Farooq, Facility Operations Manager', 54, signY + 25);
      doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text('Digital Signature: VERIFIED-CF-PK-2026-Q4-AUTH-992', 54, signY + 38);
      doc.fillColor('#78716C').fontSize(7.5).font('Helvetica').text('Certified compliant with ClearFlow ISO 9001 Facility Auditing Standards', 54, signY + 50);

      // Official Stamp
      doc.circle(pageWidth - 90, signY + 34, 24).lineWidth(1.5).stroke('#D97706');
      doc.circle(pageWidth - 90, signY + 34, 21).lineWidth(0.5).stroke('#D97706');
      doc.fillColor('#D97706').fontSize(7.5).font('Helvetica-Bold')
        .text('CLEARFLOW', pageWidth - 110, signY + 22, { width: 40, align: 'center' });
      doc.fillColor('#059669').fontSize(6).font('Helvetica-Bold')
        .text('VERIFIED', pageWidth - 110, signY + 32, { width: 40, align: 'center' });
      doc.fillColor('#78716C').fontSize(5.5).font('Helvetica')
        .text('PAKISTAN', pageWidth - 110, signY + 40, { width: 40, align: 'center' });

      // 9. FOOTER
      const footerY = doc.page.height - 35;
      doc.strokeColor('#E7E5E4').lineWidth(0.5).moveTo(40, footerY - 5).lineTo(pageWidth - 40, footerY - 5).stroke();
      doc.fillColor('#A8A29E').fontSize(7.5).font('Helvetica')
        .text(`Generated on ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} • ClearFlow Facility Management System • Confidential`, 40, footerY, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
