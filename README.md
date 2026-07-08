# Receipt Tracker

A web app for capturing receipts, parsing expense details, and emailing reimbursement reports with receipt images attached.

## Features

- **Camera or upload** — snap a photo on mobile/desktop or upload an existing image
- **Automatic parsing** — extracts merchant, date, time, amount, and category
  - Client-side OCR (Tesseract.js) works out of the box
  - Optional AI parsing (OpenAI GPT-4o-mini) when `OPENAI_API_KEY` is set
- **Expense log** — review, edit, or remove entries; click thumbnails to view full receipt
- **Expense report** — running total, category breakdown with progress bars, line-item summary
- **Email export** — sends a formatted HTML report with all receipt images attached

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

The API server runs on port **3001** (proxied through Vite in dev mode).

## Configuration

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `SMTP_HOST` | For email | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | For email | e.g. `587` |
| `SMTP_USER` | For email | Your email address |
| `SMTP_PASS` | For email | App password (not your login password) |
| `SMTP_FROM` | For email | From address |
| `OPENAI_API_KEY` | Optional | Enables AI receipt parsing |
| `PORT` | Optional | API port (default 3001) |

### Gmail setup

1. Enable 2-factor authentication on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Use that password as `SMTP_PASS`

## Usage

1. Click **Take Photo** or **Upload Image** to add a receipt
2. Review the auto-filled fields and click **Add to Expense Log**
3. Repeat for all receipts
4. Fill in report settings (your name, approver email)
5. Click **Email Report + Receipts** to send everything for reimbursement

Data is stored in your browser's localStorage — it persists across sessions on the same device.

## Deploy to Render (free tier)

This app deploys as **one Web Service** on Render's free plan — frontend and API together, $0/month.

### Free tier notes

- Service sleeps after ~15 minutes of inactivity (first load after sleep takes ~30–60s)
- 750 free instance-hours/month (enough for one always-on-ish service)
- Expense data stays in the browser (localStorage) — no database needed

### Option A — Blueprint (recommended)

1. Push this repo to GitHub (see below if you haven't yet)
2. Go to [render.com/deploy](https://render.com/deploy) or **Dashboard → New → Blueprint**
3. Connect your GitHub repo — Render reads `render.yaml` automatically
4. Add environment variables when prompted:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — for email
   - `OPENAI_API_KEY` — optional, for better receipt parsing
5. Click **Apply** — Render builds and deploys

Your app will be live at `https://receipt-tracker-xxxx.onrender.com`.

### Option B — Manual Web Service

1. **New → Web Service** → connect GitHub repo
2. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
3. Add env vars from `.env.example` in the **Environment** tab

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — receipt expense tracker"
gh repo create receipt-tracker --public --source=. --push
```

Then connect the repo in Render.

## Production (self-hosted)

```bash
npm run build
npm start
```

Serves the built app and API on one port (uses `PORT` env var, default 3001).
