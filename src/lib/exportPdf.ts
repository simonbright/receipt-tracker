import type { Expense, ExpenseTotals, ReportSettings } from '../types';
import { formatCurrency, formatDate } from '../types';

interface ExportPdfOptions {
  expenses: Expense[];
  totals: ExpenseTotals;
  settings: ReportSettings;
  dateFrom: string;
  dateTo: string;
}

function formatRangeLabel(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function receiptRef(index: number): string {
  return `R${index + 1}`;
}

function addPageNumbers(doc: import('jspdf').jsPDF) {
  const total = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${total}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
}

function addImagePage(
  doc: import('jspdf').jsPDF,
  imageData: string,
  label: string,
  ref: string
) {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2 - 20;

  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt ${ref}`, margin, margin);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(label, margin, margin + 6);

  const format = imageData.includes('image/png') ? 'PNG' : 'JPEG';
  try {
    const props = doc.getImageProperties(imageData);
    const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
    const width = props.width * ratio;
    const height = props.height * ratio;
    const x = margin + (maxWidth - width) / 2;
    const y = margin + 14;
    doc.addImage(imageData, format, x, y, width, height);
  } catch {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text('Receipt image could not be embedded', margin, margin + 24);
  }
}

export async function exportExpenseReportPdf({
  expenses,
  totals,
  settings,
  dateFrom,
  dateTo,
}: ExportPdfOptions) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const margin = 14;
  let y = margin;

  doc.setFontSize(18);
  doc.setTextColor(21, 128, 61);
  doc.text(settings.reportTitle || 'Expense Reimbursement Report', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(80);
  if (settings.employeeName) {
    doc.text(`Submitted by: ${settings.employeeName}`, margin, y);
    y += 5;
  }
  doc.text(`Period: ${formatRangeLabel(dateFrom, dateTo)}`, margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Ref', 'Date', 'Time', 'Line Item', 'Merchant', 'Amount']],
    body: expenses.map((e, i) => [
      receiptRef(i),
      formatDate(e.date),
      e.time || '—',
      e.lineItem,
      e.merchant || '—',
      formatCurrency(e.amount),
    ]),
    foot: [['', '', '', '', 'Total', formatCurrency(totals.grandTotal)]],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    footStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      5: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const tableEnd = (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y = tableEnd + 10;

  const lineItems = Object.entries(totals.byLineItem).sort(([, a], [, b]) => b - a);
  if (lineItems.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text('Breakdown by Line Item', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Line Item', 'Amount']],
      body: lineItems.map(([item, amt]) => [item, formatCurrency(amt)]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });

    y = ((doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  if (settings.notes.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('Notes', margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    const lines = doc.splitTextToSize(settings.notes.trim(), doc.internal.pageSize.getWidth() - margin * 2);
    doc.text(lines, margin, y);
  }

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const ref = receiptRef(i);
    const label = `${formatDate(expense.date)} · ${expense.lineItem} · ${expense.merchant || 'Receipt'} · ${formatCurrency(expense.amount)}`;
    addImagePage(doc, expense.imageData, label, ref);
  }

  addPageNumbers(doc);

  const filename = `expense-report-${dateFrom}-to-${dateTo}.pdf`;
  doc.save(filename);
}
