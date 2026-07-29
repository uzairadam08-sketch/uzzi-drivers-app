# Uzzi Driver Clock-In & Wages

A small private web app for a vehicle-logistics operation. Drivers clock in each
day and log their own expenses; the manager sees a live "who worked today" view
and a monthly summary of days, earnings, and expenses across all drivers.

- **Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres + Auth + RLS) · Vercel
- **Privacy:** each driver sees only their own data — enforced by Postgres Row Level Security, not just the UI.

---

## How it works (roles)

- **Driver** — logs in, taps *Clock in for today* (one per day, can undo today), logs/deletes
  expenses, and sees their own days + earnings for the month.
- **Manager (you)** — logs in, picks a date to see who's in/not in, views a monthly
  summary table across all drivers, and sets the daily rate.

Earnings = (clock-in days in the period) × daily rate. Default **£100/day**.

---

## Setup — step by step

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a name and a strong database password.
2. Once it's ready, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (under "Project API keys", reveal it) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Add your environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste in the three values from the step above.
**Never commit `.env.local`** — the service role key bypasses all security.

### 4. Run the database migration (creates tables + RLS)

Open the Supabase Dashboard → **SQL Editor** → **New query**, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and **Run**.

This creates the `profiles`, `clockins`, `expenses`, and `settings` tables, the
Row Level Security policies, the auto-profile trigger, and the default rate row.

> Prefer the CLI? With the [Supabase CLI](https://supabase.com/docs/guides/cli)
> linked to your project you can run `supabase db push` instead.

### 5. Create the 10 driver accounts

With `.env.local` filled in and the migration applied:

```bash
node scripts/seed.mjs
```

This creates 10 driver logins (`driver1@uzzi.local` … `driver10@uzzi.local`,
passwords printed to the console), each with `driver_number` 1–10. Change the
passwords afterwards (Supabase → **Authentication → Users**) or have each driver
reset their own.

### 6. Create your manager account

1. Supabase Dashboard → **Authentication → Users → Add user** → enter your email
   and a password (tick "Auto Confirm User").
2. The trigger creates a `driver` profile for you automatically. Promote it to
   manager — SQL Editor → run (use your email):

   ```sql
   update public.profiles
   set role = 'manager', display_name = 'Manager'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### 7. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>. Log in as a driver or as the manager — you're routed
to the right home automatically. Every page requires a login.

### 8. Deploy to Vercel

1. Push this repo to GitHub.
2. <https://vercel.com> → **New Project** → import the repo.
3. Add the same three environment variables (**Project Settings → Environment
   Variables**): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Add your Vercel URL to Supabase → **Authentication → URL Configuration**
   (Site URL / Redirect URLs) if you later enable email links.

---

## Project structure

```
src/
  app/
    login/                  login screen
    auth/signout/           sign-out route
    driver/                 driver dashboard + expenses (role-guarded)
    manager/                manager daily view, monthly summary, rate (role-guarded)
    page.tsx                routes each user to the right home by role
  lib/
    supabase/client.ts      browser client (anon key)
    supabase/server.ts      server client (anon key, RLS as the user)
    supabase/admin.ts       service-role client (server-only, used by seed)
    supabase/middleware.ts  session refresh + route guard
    utils.ts                GBP formatting + date helpers
supabase/migrations/
    0001_init.sql           schema + RLS + triggers
scripts/
    seed.mjs                creates the 10 driver accounts
middleware.ts               wires the session/route guard
```

---

## Security model (the privacy guarantee)

RLS is enabled on every table. Policies (in `0001_init.sql`):

- Drivers can `select/insert/delete` **only their own** rows in `clockins` and `expenses`
  (`user_id = auth.uid()`), and read their own profile.
- The manager (`role = 'manager'`) can read **all** profiles, clock-ins and expenses,
  and update `settings`. A `SECURITY DEFINER` `is_manager()` helper avoids RLS recursion.
- Any logged-in user can read `settings` (to compute earnings); only the manager can change it.
- `anon` (logged-out) has no table grants at all — nothing is readable without a login.

Because these rules live in the database, two drivers on two phones physically
cannot read each other's data even if the UI were bypassed.

---

## Acceptance criteria — how each is met

1. **Drivers can't see each other's data** — RLS `user_id = auth.uid()` on `clockins`/`expenses`.
2. **Manager sees everything + live "who worked today"** — `is_manager()` read policies; daily view.
3. **Driver clock-in shows on manager dashboard after refresh** — shared Postgres, manager reads all.
4. **No double clock-in per day** — `unique (user_id, work_date)` constraint on `clockins`.
5. **Earnings = days × rate; changing rate updates everywhere** — earnings computed from the single `settings.daily_rate`.
6. **Expenses and clock-ins are independent** — separate tables, separate actions.
7. **Nothing accessible without login** — middleware redirects to `/login`; `anon` has no grants.
```
