# Fix "Invoiced this month" card

The card counts invoiced jobs by the date the job was created, so jobs created last month and invoiced this month are missing. The app does not keep the date a job was invoiced.

## Steps
1. Add an `invoiced_at` date to job orders, filled in automatically the moment a job's status becomes Invoiced (and cleared if it moves back).
2. Back-fill existing invoiced jobs from the job change history (falling back to the last-updated date).
3. Carry the new date through the dashboard's job list and offline cache.
4. Make the card count and sum jobs whose invoiced date is in the current month.

## Technical details
- Migration: `ALTER TABLE job_orders ADD COLUMN invoiced_at timestamptz`; BEFORE UPDATE/INSERT trigger sets it on status transition to `invoiced`; backfill from `job_order_logs` where `changed_fields->'status'` became invoiced, else `updated_at`.
- Add `invoicedAt` to `DashboardJob`, the list select columns, Dexie mapping and delta sync.
- `KpiStrip.tsx`: filter on `invoicedAt ?? createdAt`.
