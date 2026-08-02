# Petty Cash Management System

A full-stack petty cash tracking application built for a real company workflow — employees submit a request, finance reviews and disburses it, and every transaction is logged against a running imprest ledger with GL codes for month-end reconciliation.

**Live app:** https://petty-cash-app-lac.vercel.app
**Stack:** React (Vite) · Supabase (PostgreSQL, Auth, Storage, Realtime)

---

## Why this exists

Most small businesses track petty cash in a spreadsheet: no access control, no audit trail, no way to verify who approved what. This project digitizes that process while preserving the real accounting logic behind it — an imprest system, where a fund is periodically replenished (not reset to a fixed cap), and every disbursement is coded against a chart of accounts for the company ledger.

## Features

**Two role-based dashboards, one codebase**
- **Employee** — submit a request (department, purpose, amount, optional receipt/invoice upload), track its status, see the current fund balance.
- **Finance/Admin** — review pending requests, approve with the actual amount disbursed + a searchable GL code, log fund replenishments and opening balances, edit or void ledger entries with a required reason.

**Real access control, enforced by the database**
Role permissions are implemented with PostgreSQL Row Level Security, not just hidden UI elements — even a modified frontend can't approve a request or edit the ledger without the `admin` role.

**Imprest-accurate ledger**
Cash at hand = opening balance + replenishments − disbursements, calculated live from the full transaction history. Partial replenishments carry forward naturally — no special-casing needed, it falls out of the running balance.

**Chart of accounts lookup**
Bulk CSV import of a full chart of accounts (tested against 9,000+ entries) with a live, debounced search-as-you-type picker, querying the database directly rather than loading everything into the browser.

**Receipt/invoice attachments**
Employees can attach a supporting document to a request. Files live in a private Supabase Storage bucket; finance views them via short-lived signed URLs rather than public links.

**Real-time notifications**
Database triggers automatically notify finance when a request comes in, and notify the employee when it's fulfilled or declined — pushed live via Supabase Realtime.

**Month-end export**
One-click `.xlsx` export for any month, formatted to match the company's existing reconciliation sheet (opening balance / replenishments / total outflow / cash at hand, followed by a numbered transaction list with GL codes).

**Auditable corrections**
Ledger entries can be edited (non-monetary fields only) or voided with a required reason. Voided entries stay visible, marked, and excluded from balance calculations — mirroring a real reversing journal entry rather than deleting history.

**Professional auth**
Sign-up/sign-in with password strength scoring, show/hide password toggle, and a password reset flow hardened against email security scanners silently consuming one-time reset links (a known issue with Gmail/Outlook link prescanning).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, React Router |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Email | Brevo (custom SMTP) |
| Styling | Plain CSS with design tokens, no framework |
| Export | [`xlsx`](https://www.npmjs.com/package/xlsx) |
| Hosting | Vercel |

## Database schema

- `profiles` — one row per user: role (`employee`/`admin`), full name, department
- `petty_cash_requests` — lightweight request queue (department, purpose, estimated amount, optional receipt path, status)
- `petty_cash_ledger` — the source of truth: every `opening_balance`, `imprest`, and `disbursement` entry, with GL code, beneficiary, and void tracking
- `chart_of_accounts` — GL codes + descriptions, searchable
- `notifications` — per-user notification feed, populated by database triggers

Row Level Security policies enforce that only admins can approve requests, edit the ledger, or update the fund settings.

## Running locally

```bash
git clone https://github.com/DHEBIT/Petty-cash-app.git
cd Petty-cash-app
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

You'll need to recreate the database schema (tables, RLS policies, triggers) in a fresh Supabase project's SQL editor, and set up custom SMTP (e.g. via Brevo) for auth emails to work reliably. First account created should be promoted to `admin` manually via the `profiles` table.

## Possible next steps

- Multiple concurrent funds (per department/site) instead of one global ledger
- PDF export in addition to Excel
- Configurable approval thresholds requiring secondary sign-off above a certain amount