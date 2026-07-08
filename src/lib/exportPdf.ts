import type { Expense, ExpenseTotals, ReportSettings } from '../types';
import {
  formatCurrency,
  formatDate,
  isAllLineItemsSelected,
  isNoneLineItemsSelected,
  normalizeSelectedLineItems,
} from '../types';

interface ExportPdfOptions {
  expenses: Expense[];
  totals: ExpenseTotals;
  settings: ReportSettings;
  dateFrom: string;
  dateTo: string;
}

/** Neutral professional palette — no app/car brand colors in the PDF. */
const INK = {
  title: [17, 24, 39] as [number, number, number],
  body: [55, 65, 81] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  rule: [209, 213, 219] as [number, number, number],
  headFill: [31, 41, 55] as [number, number, number],
  footFill: [243, 244, 246] as [number, number, number],
  white: 255,
};

function formatRangeLabel(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function formatLineItemFilterLabel(settings: ReportSettings): string {
  const selected = normalizeSelectedLineItems(settings.lineItems);
  if (isNoneLineItemsSelected(selected)) return 'None selected';
  if (isAllLineItemsSelected(selected)) return 'All line items';
  return selected.join(', ');
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
    doc.setDrawColor(...INK.rule);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK.muted);
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
  const maxHeight = pageHeight - margin * 2 - 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK.title);
  doc.text(`Receipt ${ref}`, margin, margin);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK.body);
  doc.text(label, margin, margin + 6);

  doc.setDrawColor(...INK.rule);
  doc.setLineWidth(0.4);
  doc.line(margin, margin + 10, pageWidth - margin, margin + 10);

  const format = imageData.includes('image/png')
    ? 'PNG'
    : imageData.includes('image/svg')
      ? 'PNG'
      : 'JPEG';
  try {
    const props = doc.getImageProperties(imageData);
    const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
    const width = props.width * ratio;
    const height = props.height * ratio;
    const x = margin + (maxWidth - width) / 2;
    const y = margin + 16;
    doc.addImage(imageData, format, x, y, width, height);
  } catch {
    doc.setFontSize(11);
    doc.setTextColor(...INK.muted);
    doc.text('Receipt image could not be embedded', margin, margin + 28);
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
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK.title);
  doc.text(settings.reportTitle || 'Expense Reimbursement Report', margin, y);
  y += 6;

  doc.setDrawColor(...INK.rule);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK.body);
  if (settings.employeeName) {
    doc.text(`Submitted by: ${settings.employeeName}`, margin, y);
    y += 5;
  }
  doc.text(`Period: ${formatRangeLabel(dateFrom, dateTo)}`, margin, y);
  y += 5;
  const lineItemLines = doc.splitTextToSize(
    `Line items: ${formatLineItemFilterLabel(settings)}`,
    pageWidth - margin * 2
  );
  doc.text(lineItemLines, margin, y);
  y += lineItemLines.length * 5;
  doc.setTextColor(...INK.muted);
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
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      textColor: INK.body,
      lineColor: INK.rule,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: INK.headFill,
      textColor: INK.white,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: INK.footFill,
      textColor: INK.title,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      5: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const tableEnd =
    (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    y + 40;
  y = tableEnd + 10;

  const lineItems = Object.entries(totals.byLineItem).sort(([, a], [, b]) => b - a);
  if (lineItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK.title);
    doc.text('Breakdown by Line Item', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Line Item', 'Amount']],
      body: lineItems.map(([item, amt]) => [item, formatCurrency(amt)]),
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        textColor: INK.body,
        lineColor: INK.rule,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: INK.footFill,
        textColor: INK.title,
        fontStyle: 'bold',
      },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });

    y =
      ((doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y) + 10;
  }

  if (settings.notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK.title);
    doc.text('Notes', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK.body);
    const lines = doc.splitTextToSize(settings.notes.trim(), pageWidth - margin * 2);
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
