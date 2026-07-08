# Receipt Tracker

A web app for capturing receipts, parsing expense details, and emailing reimbursement reports with receipt images attached.

## Features

- **Camera or upload** — snap a photo on mobile/desktop or upload an existing image
- **Automatic parsing** — extracts merchant, date, time, amount, and category
  - Client-side OCR (Tesseract.js) works out of the box
  - Optional AI parsing via **OpenRouter** when `OPENROUTER_API_KEY` is set (default model: `google/gemini-2.5-flash-lite`, ~$0.0002/receipt)
- **Expense log** — review, edit, or remove entries; click thumbnails to view full receipt
- **Expense report** — running total, category breakdown with progress bars, line-item summary
- **PDF export** — download a reimbursement report for a selected date range, with receipt images attached in the PDF
- **Cloud sync** — expenses, settings, and reminders auto-save to PostgreSQL (or local JSON in dev)

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
| `OPENROUTER_API_KEY` | For AI parsing | Get from [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | Optional | Vision model, default `google/gemini-2.5-flash-lite` |
| `SYNC_KEY` | For cloud sync | Shared secret — must match `VITE_SYNC_KEY` |
| `VITE_SYNC_KEY` | For cloud sync | Same value as `SYNC_KEY` (baked in at build time) |
| `DATABASE_URL` | Production sync | Auto-set on Render when using the Postgres add-on |
| `PORT` | Optional | API port (default 3001) |

### Gmail setup

1. Enable 2-factor authentication on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Use that password as `SMTP_PASS`

## Usage

1. Click **Take Photo** or **Upload Image** to add a receipt
2. Review the auto-filled fields and click **Add to Expense Log**
3. Repeat for all receipts
4. Set the **From** and **To** dates for your report
5. Click **Export PDF** to download the summary and receipt images for that period

Data is stored locally in your browser and **auto-synced to the database** when the server is configured. The footer shows **Synced** when cloud save is working.

### Cloud sync setup

1. Add a **PostgreSQL** database on Render (included in `render.yaml`)
2. Set `SYNC_KEY` and `VITE_SYNC_KEY` to the same random secret (e.g. `openssl rand -hex 16`)
3. Redeploy — mobile receipts sync automatically within ~2 seconds

Without `DATABASE_URL`, local dev uses `server/data/sync-data.json` (not persistent across Render deploys).

## Deploy to Render (always-on, low cost)

This app deploys as **one Web Service** on Render's Starter plan — frontend and API together, always on.

### Cost notes

- Render's free web services sleep after inactivity; use Starter to avoid sleeping
- Starter is Render's lowest-cost always-on web service plan
- Expense data syncs to PostgreSQL when configured; otherwise stays in the browser only

### Option A — Blueprint (recommended)

1. Push this repo to GitHub (see below if you haven't yet)
2. Go to [render.com/deploy](https://render.com/deploy) or **Dashboard → New → Blueprint**
3. Connect your GitHub repo — Render reads `render.yaml` automatically
4. Add environment variables when prompted:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — for email
   - `OPENROUTER_API_KEY` — optional, for better receipt parsing via OpenRouter
   - `SYNC_KEY` and `VITE_SYNC_KEY` — same secret, for auto cloud sync
5. Click **Apply** — Render builds and deploys

Your app will be live at `https://receipt-tracker-xxxx.onrender.com`.

### Option B — Manual Web Service

1. **New → Web Service** → connect GitHub repo
2. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Starter
3. Add env vars from `.env.example` in the **Environment** tab

> **Important:** Create a **Web Service**, not a Static Site. If `/api/health` returns 404, the service type is wrong — delete it and redeploy using the blueprint.

### Mobile troubleshooting

- Hard-refresh or clear site data if you see a blank page after an update
- Use **Take Photo** on iPhone/Android (opens the native camera)
- Private browsing on iOS can block saving expenses — use a normal browser tab
- After redeploying, wait for Render to finish building before testing on phone

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
