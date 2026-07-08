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

function addImagePage(
  doc: import('jspdf').jsPDF,
  imageData: string,
  label: string
) {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2 - 12;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(label, margin, margin);

  const format = imageData.includes('image/png') ? 'PNG' : 'JPEG';
  try {
    const props = doc.getImageProperties(imageData);
    const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
    const width = props.width * ratio;
    const height = props.height * ratio;
    const x = margin + (maxWidth - width) / 2;
    const y = margin + 8;
    doc.addImage(imageData, format, x, y, width, height);
  } catch {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text('Receipt image could not be embedded', margin, margin + 20);
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
    head: [['Date', 'Time', 'Merchant', 'Category', 'Amount']],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.time || '—',
      e.merchant || '—',
      e.category,
      formatCurrency(e.amount),
    ]),
    foot: [['', '', '', 'Total', formatCurrency(totals.grandTotal)]],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    footStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: margin, right: margin },
  });

  const tableEnd = (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y = tableEnd + 10;

  const categories = Object.entries(totals.byCategory).sort(([, a], [, b]) => b - a);
  if (categories.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text('Breakdown by Category', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount']],
      body: categories.map(([cat, amt]) => [cat, formatCurrency(amt)]),
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

  for (const expense of expenses) {
    const label = `${formatDate(expense.date)} · ${expense.merchant || 'Receipt'} · ${formatCurrency(expense.amount)}`;
    addImagePage(doc, expense.imageData, label);
  }

  const filename = `expense-report-${dateFrom}-to-${dateTo}.pdf`;
  doc.save(filename);
}
