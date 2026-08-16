# TutorPulse — Scalable Smart Tuition Management Platform

A production-grade, highly responsive web application built with **Next.js 15 (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL with Row Level Security)**. Designed specifically as a smart personal assistant for tuition tutors to manage students, recurring schedules, live class timers, Google Meet sessions, attendance tracking, homework logging, automated multi-model billing, payments, and monthly reporting.

---

## 🌟 Key Features

1. **100% Data-Driven & Scalable Architecture**:
   - Zero hardcoding for student logic. Supports 3, 10, 50, or 100+ students dynamically without any code changes.
   - Sreesha, Siva, and Mrithika are provisioned as initial database seed records.

2. **Automated Multi-Model Billing Engine**:
   - **`CLASS_BATCH`** (e.g. Sreesha): Tracks chargeable `PRESENT` classes (e.g., 7/8 completed). When the 8th class is completed, automatically triggers a ₹6,750 fee. Settle payments and reset counters cleanly without losing history.
   - **`MONTHLY_FIXED`** (e.g. Siva): ₹8,500 monthly fee with customizable billing cycle (3rd of month &rarr; 2nd of next month) due on 3rd. Attendance is tracked independently and does not reduce fixed fee.
   - **`MONTHLY_PER_CLASS`** (e.g. Mrithika): Dynamic fee calculation (`completed chargeable classes × configured per-class fee`) due on the 3rd.
   - **`PER_CLASS`**: Pay-as-you-go billing per completed session for future students.

3. **Live Class Timer & Completion Workflow**:
   - Live stopwatch (`START CLASS` &rarr; `CLASS IN PROGRESS` &rarr; `END CLASS`).
   - Automatically calculates elapsed duration in minutes.
   - 1-click modal for Attendance status (`PRESENT`, `ABSENT`, `RESCHEDULED`, `CANCELLED`), Topic, Subtopic, Homework, and Notes.

4. **1-Click Google Meet Launcher**:
   - Instant `JOIN GOOGLE MEET` buttons on today's class cards, calendar events, and student profile.
   - Configurable at student level and overridable at schedule level.

5. **Smart Non-Destructive Rescheduling**:
   - **This class only**: Marks the original session as `RESCHEDULED` and creates a linked `UPCOMING` session on the new date/time. Historical data is preserved.
   - **Recurring schedule update**: Adjusts schedule effective date range.

6. **Interactive Calendar**:
   - Month, Week, and Day views with status filters, student filters, and quick session drawer.

7. **Central Fees & Payments Hub**:
   - Track Expected, Received, Pending, and Overdue tuition fees.
   - Quick `RECORD PAYMENT` modal (`CASH`, `UPI`, `BANK_TRANSFER`) with instant balance reconciliation.
   - Printable / clean PDF tuition receipts.

8. **Monthly Reporting & CSV Data Exporters**:
   - Recharts visual analytics (Collections vs Expected, Attendance breakdown).
   - Student-wise breakdown table.
   - 1-Click CSV Exporters: `Export Monthly Report CSV`, `Export Attendance CSV`, `Export Payments CSV`.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Recharts, Canvas Confetti.
- **Backend**: Next.js Server-side routes & pure calculation billing engine.
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) & UUID primary keys.
- **Deployment**: Optimized for Vercel.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### 2. Installation
```bash
# Navigate to project directory
cd tuition-master

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Database Setup & Migrations

1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Go to **SQL Editor** in your Supabase dashboard.
3. Run the schema migration script:
   - Copy contents of `supabase/migrations/001_initial_schema.sql` and run it.
4. Run the seed data script:
   - Copy contents of `supabase/seed.sql` and run it.
5. In Supabase **Project Settings > API**, copy `URL` and `anon public` key into your `.env.local`.

---

## 🧪 Automated Unit Tests

Run the automated test suite testing all billing models, batch threshold alerts, payments, and non-destructive rescheduling:
```bash
npm run test
# Or directly with tsx:
npx tsx tests/billing.test.ts
```

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub / GitLab.
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Select your repository.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.
6. Vercel will automatically build and deploy the production web application.

---

## 📚 How-To Guide for Tutors

### Adding Future Students
1. Click **Add Student** in the top navigation or sidebar.
2. Follow the 5-step guided wizard:
   - Step 1: Basic student and parent contact details.
   - Step 2: Select or create subjects.
   - Step 3: Set weekly recurring schedules and Google Meet links.
   - Step 4: Choose billing model (`CLASS_BATCH`, `MONTHLY_FIXED`, `MONTHLY_PER_CLASS`, `PER_CLASS`) and rates.
   - Step 5: Review and activate.

### Changing Fees or Per-Class Rates
1. Navigate to **Students** &rarr; Select student &rarr; **Edit Settings** tab.
2. Modify the `Fixed / Batch Amount` or `Per-Class Rate`.
3. Click **Save Changes**. Past invoices remain immutable; new rates apply to future billing cycles.

### Rescheduling a Class
1. Open the **Calendar** or **Dashboard**.
2. Click on the class session &rarr; Select **Reschedule Session**.
3. Choose the new date and time. The system will mark the original class as `RESCHEDULED` and create the new `UPCOMING` session.
