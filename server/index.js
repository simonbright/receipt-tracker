import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { setupPush, isPushConfigured } from './push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || 3001;

if (!isProduction) {
  app.use(cors());
}
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function buildReportHtml({ reportTitle, employeeName, expenses, totals, notes }) {
  const rows = expenses
    .map(
      (e) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${e.date || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${e.time || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${e.merchant || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${e.category || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(e.amount)}</td>
      </tr>`
    )
    .join('');

  const categoryRows = Object.entries(totals.byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([cat, amt]) => `
      <tr>
        <td style="padding:6px 8px;">${cat}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;">${formatCurrency(amt)}</td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Inter,system-ui,sans-serif;color:#111827;max-width:720px;margin:0 auto;padding:24px;">
  <h1 style="color:#15803d;margin:0 0 4px;">${reportTitle || 'Expense Reimbursement Report'}</h1>
  <p style="color:#6b7280;margin:0 0 24px;">Submitted by ${employeeName || 'Employee'} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="background:#f0fdf4;">
        <th style="padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;color:#15803d;">Date</th>
        <th style="padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;color:#15803d;">Time</th>
        <th style="padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;color:#15803d;">Merchant</th>
        <th style="padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;color:#15803d;">Category</th>
        <th style="padding:10px 8px;text-align:right;font-size:12px;text-transform:uppercase;color:#15803d;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f9fafb;">
        <td colspan="4" style="padding:12px 8px;font-weight:700;text-align:right;">Total</td>
        <td style="padding:12px 8px;font-weight:700;text-align:right;color:#15803d;font-size:18px;">${formatCurrency(totals.grandTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <h2 style="font-size:16px;color:#374151;margin:0 0 12px;">Breakdown by Category</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#fafafa;border-radius:8px;">
    <tbody>${categoryRows}</tbody>
  </table>

  ${notes ? `<p style="color:#4b5563;background:#f9fafb;padding:12px;border-radius:8px;"><strong>Notes:</strong> ${notes}</p>` : ''}

  <p style="color:#9ca3af;font-size:13px;margin-top:32px;">Receipt images are attached to this email for your records.</p>
</body>
</html>`;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    smtpConfigured: Boolean(getTransporter()),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    pushConfigured: isPushConfigured(),
  });
});

setupPush(app);

app.post('/api/parse-receipt', upload.single('image'), async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI parsing not configured. Use client-side OCR instead.' });
    }

    const imageBuffer = req.file?.buffer;
    const base64FromBody = req.body?.imageBase64;

    let base64;
    if (imageBuffer) {
      base64 = imageBuffer.toString('base64');
    } else if (base64FromBody) {
      base64 = base64FromBody.replace(/^data:image\/\w+;base64,/, '');
    } else {
      return res.status(400).json({ error: 'No image provided' });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract receipt information from this image. Return ONLY valid JSON with these fields:
{
  "merchant": "store/restaurant name (e.g. Esso Circle K, not the address)",
  "date": "YYYY-MM-DD",
  "time": "HH:MM in 24h format",
  "amount": 0.00,
  "category": "one of: Meals, Travel, Office Supplies, Transportation, Lodging, Entertainment, Other",
  "description": "brief description of purchase",
  "confidence": 0.0 to 1.0
}

Rules:
- amount must be the final total paid (e.g. "TOTAL CAD $ 31.18" -> 31.18)
- For gas/fuel receipts (Esso, Circle K, Petro-Canada, Shell), category is Transportation
- Parse labeled fields like DATE: and TIME: when present
- Canadian receipts may show CAD, HST, GST — still use the total purchase amount
- Use null for fields you cannot determine`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response', raw: content });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ parsed, source: 'ai' });
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse receipt' });
  }
});

app.post('/api/email-report', async (req, res) => {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return res.status(503).json({
        error: 'Email not configured. Copy .env.example to .env and set SMTP settings.',
      });
    }

    const {
      to,
      cc,
      reportTitle,
      employeeName,
      expenses,
      totals,
      notes,
      images,
    } = req.body;

    if (!to || !expenses?.length) {
      return res.status(400).json({ error: 'Recipient email and at least one expense are required' });
    }

    const html = buildReportHtml({ reportTitle, employeeName, expenses, totals, notes });

    const attachments = (images || []).map((img, i) => {
      const base64 = img.data.replace(/^data:image\/\w+;base64,/, '');
      const ext = img.data.includes('image/png') ? 'png' : 'jpg';
      const merchant = (expenses[i]?.merchant || `receipt-${i + 1}`).replace(/[^a-z0-9]/gi, '-').slice(0, 30);
      return {
        filename: `${merchant}-${expenses[i]?.date || i + 1}.${ext}`,
        content: Buffer.from(base64, 'base64'),
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      };
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      cc: cc || undefined,
      subject: `${reportTitle || 'Expense Report'} — ${formatCurrency(totals.grandTotal)}`,
      html,
      attachments,
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

if (existsSync(distPath)) {
  app.use(express.static(distPath, {
    index: false,
    maxAge: isProduction ? '1y' : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Receipt Tracker running on port ${PORT}${existsSync(distPath) ? ' (serving app + API)' : ' (API only)'}`);
});
