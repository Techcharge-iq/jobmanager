# Job Manager

An offline-aware job-order management application for managing customers, assignments,
approvals, statuses, notifications, reports, and role-based administration.

All monetary amounts use Omani rials (OMR), displayed with the `ر.ع.` symbol and
three decimal places.

## Project structure

- `src/pages/Index.tsx` provides the authenticated application shell.
- `src/types/jobOrder.ts` contains the canonical job-domain types.
- `src/utils/jobOrderTransforms.ts` contains database/cache-to-UI transformations.
- `src/services/` contains Supabase APIs and synchronization services.
- `src/lib/dexieDb.ts` defines the offline IndexedDB cache.
- `supabase/migrations/` contains database schema and RLS changes.
- `supabase/functions/` contains authenticated Edge Functions.

## Application routes

Authenticated views are available at:

- `/dashboard`
- `/jobs/approved`
- `/settings`
- `/reports`
- `/admin/jobs`
- `/admin/users`
- `/admin/access`

Access is enforced by both the application and Supabase policies. Users without the
required role are shown the unauthorized page.

## Local development

Create a `.env` file with the public Supabase settings:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Then install dependencies and start the application:

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm run lint
npm run build
```

The browser cache is powered by Dexie, isolated per signed-in user, and updated from
Supabase Realtime row changes. Successful job and invoice writes update Dexie from
the returned database row, avoiding a second fetch; no-op job edits do not send an
UPDATE. Sync work is serialized, retried on failure, and reconciles hard-deleted jobs
during startup and after a Realtime reconnect. Realtime sync pauses while the app tab
is hidden or the browser is offline, then reconciles when the tab becomes visible and
online again. The notification bell opens a tray; alert dialogs only open when the
user chooses to review an actionable notification.

No new Edge Function is required for these frontend changes. Supabase Realtime must
be enabled for `job_orders`, `notifications`, and `job_edit_audit` for live updates
and alerts to reach connected clients. The existing `send-notification` function is
still used for pending-job email notifications and must remain deployed for that
feature. Production deployments should apply the project's Supabase migrations and
deploy any Edge Functions already used by the app.

Workflow alerts listen for new job orders and approval or completion status changes
through Supabase Realtime. Unread alerts are kept in browser local storage so they
survive tab closure and synchronize between tabs without adding database fields or
tables. The legacy full-table alert snapshot is removed on startup.
Admin completion alerts remain queued in the tray until an invoice number is saved
and the job is marked invoiced; closing the action dialog leaves the alert available
for later. The dashboard groups cached active jobs into design, approval, execution,
and invoicing queues. Queue items animate in with a short stagger; browsers using a
reduced-motion preference intentionally skip the animation.
If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

Install Node.js 20.19.x or 22.12+ and npm before starting the app. You can install
Node.js with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/095e06d9-c491-47ec-9d35-0647fb9fe1de) and click on Share -> Publish.

### Deploy to Cloudflare Workers

The project includes the Cloudflare Vite plugin and Wrangler configuration. After
setting the Worker name in `wrangler.jsonc` and authenticating Wrangler, deploy with:

```sh
npm run deploy
```

The Worker serves the Vite build as a single-page application, including client-side
routes.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
