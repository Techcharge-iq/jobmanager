import {
  db,
  DexieCustomer,
  DexieDesigner,
  DexieJobOrder,
  DexieJobTitle,
  DexieSalesman,
  clearAllData,
  withCacheUser,
} from '@/lib/dexieDb';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { JobOrderRecord } from '@/types/jobOrder';
import { subscribeToJobOrderChanges } from '@/data/realtime';

const SYNC_META_ID = 'main';
const REF_SYNC_INTERVAL_MS = 10 * 60_000; // 10 min - reference data rarely changes
const REPAIR_INTERVAL_MS = 60 * 60_000; // 1 hour - repair check is expensive
const RECONNECT_SYNC_MIN_INTERVAL_MS = 60_000;

// Egress-optimized column lists (excludes large `description` HTML — fetched on demand in JobDetails)
export const JOB_LIST_COLUMNS =
  'id,job_order_number,customer_id,job_title_id,designer_id,salesman_id,status,priority,branch,assignee,due_date,estimated_hours,actual_hours,total_value,invoice_number,invoiced_at,job_order_details,client_name,delivered_at,approval_status,approval_notes,approved_by,approved_at,created_by,created_at,updated_at,description_plain';
type JobOrderSyncRecord = Omit<JobOrderRecord, 'description'>;

let stopRealtimeListener: (() => void) | null = null;
let realtimeUserId: string | null = null;
let lastRefSyncAt = 0;
let lastRefSyncUserId: string | null = null;
let lastRepairAt = 0;
let lastRepairUserId: string | null = null;
let syncQueue: Promise<void> = Promise.resolve();
let initialSyncPromise: { userId: string; promise: Promise<void> } | null = null;
let deltaSyncPromise: { userId: string; promise: Promise<number> } | null = null;
let repairSyncPromise: { userId: string; promise: Promise<number> } | null = null;

export function isSyncAvailable(): boolean {
  return navigator.onLine && document.visibilityState === 'visible';
}

function runSync<T>(operation: () => Promise<T>): Promise<T> {
  const result = syncQueue.then(operation, operation);
  syncQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function retrySync<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

// Get last sync time
async function getLastSyncTime(): Promise<string | null> {
  const meta = await db.syncMeta.get(SYNC_META_ID);
  return meta?.lastSyncTime || null;
}

// Update last sync time
async function setLastSyncTime(userId: string, time: string) {
  await withCacheUser(userId, [], () =>
    db.syncMeta.put({ id: SYNC_META_ID, lastSyncTime: time, syncInProgress: false, ownerUserId: userId }),
  );
}

// Check if initial sync is needed
export async function needsInitialSync(): Promise<boolean> {
  return !(await getLastSyncTime());
}

async function syncInitialData(userId: string): Promise<void> {
  if (!isSyncAvailable()) return;
  const syncStartedAt = new Date().toISOString();
  await syncReferenceData(userId, true);
  if (!isSyncAvailable()) return;

  const { count, error: countError } = await supabase
    .from('job_orders')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil((count || 0) / BATCH_SIZE);

  for (let batch = 0; batch < totalBatches; batch++) {
    if (!isSyncAvailable()) return;
    const from = batch * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data: jobOrders, error } = await supabase
      .from('job_orders')
      .select(JOB_LIST_COLUMNS)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (jobOrders && jobOrders.length > 0) {
      const enrichedJobs = await enrichJobOrders(jobOrders);
      await withCacheUser(userId, [db.jobs], () => db.jobs.bulkPut(enrichedJobs));
    }
  }

  if (isSyncAvailable()) {
    await setLastSyncTime(userId, syncStartedAt);
  }
}

// Perform full initial sync
export function performInitialSync(userId: string): Promise<void> {
  if (initialSyncPromise?.userId === userId) return initialSyncPromise.promise;

  const sync = runSync(() => retrySync(() => syncInitialData(userId)));
  const trackedSync = sync.finally(() => {
    if (initialSyncPromise?.promise === trackedSync) initialSyncPromise = null;
  });
  initialSyncPromise = { userId, promise: trackedSync };
  return trackedSync;
}

// Sync reference data (customers, salesmen, designers, job titles)
async function syncReferenceData(userId: string, force = false): Promise<void> {
  if (!isSyncAvailable()) return;
  // Throttle: skip if recently synced (reference data rarely changes)
  if (
    !force &&
    lastRefSyncUserId === userId &&
    Date.now() - lastRefSyncAt < REF_SYNC_INTERVAL_MS
  ) {
    return;
  }

  const [customersRes, profilesRes, jobTitlesRes] = await Promise.all([
    supabase.from('customers').select('id, name'),
    supabase.from('profiles').select('id, full_name, email, phone, role'),
    supabase.from('job_titles').select('id, job_title_id')
  ]);
  if (customersRes.error) throw customersRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (jobTitlesRes.error) throw jobTitlesRes.error;
  if (!isSyncAvailable()) return;
  
  await withCacheUser(userId, [db.customers, db.salesmen, db.designers, db.jobTitles], async () => {
    if (customersRes.data) {
      await db.customers.bulkPut(customersRes.data.map(c => ({ id: c.id, name: c.name })));
    }

    if (profilesRes.data) {
      const salesmen = profilesRes.data
        .filter(p => p.role === 'salesman' || p.role === 'admin' || p.role === 'manager')
        .map(p => ({
          id: p.id,
          name: p.full_name || 'Unknown',
          ...(p.email ? { email: p.email } : {}),
          ...(p.phone ? { phone: p.phone } : {}),
        }));

      const designers = profilesRes.data
        .filter(p => p.role === 'designer' || p.role === 'admin' || p.role === 'manager')
        .map(p => ({
          id: p.id,
          name: p.full_name || 'Unknown',
          ...(p.phone ? { phone: p.phone } : {}),
        }));

      await db.salesmen.bulkPut(salesmen);
      await db.designers.bulkPut(designers);
    }

    if (jobTitlesRes.data) await db.jobTitles.bulkPut(jobTitlesRes.data);
  });
  lastRefSyncAt = Date.now();
  lastRefSyncUserId = userId;
}

// Enrich job orders with related data from Dexie
async function enrichJobOrders(jobOrders: JobOrderSyncRecord[]): Promise<DexieJobOrder[]> {
  const customerIds = Array.from(new Set(jobOrders.map((job) => job.customer_id)));
  const salesmanIds = Array.from(
    new Set(jobOrders.map((job) => job.salesman_id).filter((id): id is string => id !== null)),
  );
  const designerIds = Array.from(
    new Set(jobOrders.map((job) => job.designer_id).filter((id): id is string => id !== null)),
  );
  const jobTitleIds = Array.from(
    new Set(jobOrders.map((job) => job.job_title_id).filter((id): id is string => id !== null)),
  );
  
  const [customers, salesmen, designers, jobTitles]: [
    DexieCustomer[],
    DexieSalesman[],
    DexieDesigner[],
    DexieJobTitle[],
  ] = await Promise.all([
    customerIds.length > 0 ? db.customers.where('id').anyOf(customerIds).toArray() : [],
    salesmanIds.length > 0 ? db.salesmen.where('id').anyOf(salesmanIds).toArray() : [],
    designerIds.length > 0 ? db.designers.where('id').anyOf(designerIds).toArray() : [],
    jobTitleIds.length > 0 ? db.jobTitles.where('id').anyOf(jobTitleIds).toArray() : []
  ]);
  
  const customerMap = new Map<string, string>();
  customers.forEach(c => customerMap.set(c.id, c.name));
  
  const salesmanMap = new Map<string, string>();
  salesmen.forEach(s => salesmanMap.set(s.id, s.name));
  
  const designerMap = new Map<string, string>();
  designers.forEach(d => designerMap.set(d.id, d.name));
  
  const jobTitleMap = new Map<string, string>();
  jobTitles.forEach(j => jobTitleMap.set(j.id, j.job_title_id));
  
  const customerObjects = new Map<string, { id: string; name: string }>();
  customers.forEach(c => customerObjects.set(c.id, { id: c.id, name: c.name }));

  return jobOrders.map(job => ({
    id: job.id,
    job_order_number: job.job_order_number,
    customer_id: job.customer_id,
    customer_name: customerObjects.get(job.customer_id)?.name || 'Unknown Customer',
    job_title_id: job.job_title_id,
    job_title: job.job_title_id ? jobTitleMap.get(job.job_title_id) || 'No Title' : 'No Title',
    designer_id: job.designer_id,
    designer_name: job.designer_id ? designerMap.get(job.designer_id) || 'Unassigned' : 'Unassigned',
    salesman_id: job.salesman_id,
    salesman_name: job.salesman_id ? salesmanMap.get(job.salesman_id) || 'Unassigned' : 'Unassigned',
    status: job.status,
    priority: job.priority,
    branch: job.branch,
    assignee: job.assignee,
    due_date: job.due_date,
    estimated_hours: job.estimated_hours,
    actual_hours: job.actual_hours,
    total_value: job.total_value,
    invoice_number: job.invoice_number,
    invoiced_at: job.invoiced_at,
    job_order_details: job.job_order_details,
    client_name: job.client_name,
    delivered_at: job.delivered_at,
    approval_status: job.approval_status,
    approval_notes: job.approval_notes,
    approved_by: job.approved_by,
    approved_at: job.approved_at,
    created_by: job.created_by,
    created_at: job.created_at,
    updated_at: job.updated_at,
    description_plain: job.description_plain
  }));
}

// Delta sync - fetch only updated records
export function performDeltaSync(userId: string): Promise<number> {
  if (deltaSyncPromise?.userId === userId) return deltaSyncPromise.promise;

  const sync = runSync(() => retrySync(async () => {
    if (!isSyncAvailable()) return 0;
    const lastSync = await getLastSyncTime();
    if (!lastSync) {
      await syncInitialData(userId);
      return 0;
    }

    // Sync reference data (throttled internally to every 10 min)
    await syncReferenceData(userId);
    if (!isSyncAvailable()) return 0;
    
    const syncStartedAt = new Date().toISOString();
    const batchSize = 500;
    let offset = 0;
    let updatedCount = 0;

    while (true) {
      if (!isSyncAvailable()) return updatedCount;
      const { data: updatedJobs, error } = await supabase
        .from('job_orders')
        .select(JOB_LIST_COLUMNS)
        .gt('updated_at', lastSync)
        .lte('updated_at', syncStartedAt)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!updatedJobs || updatedJobs.length === 0) break;

      const enrichedJobs = await enrichJobOrders(updatedJobs);
      await withCacheUser(userId, [db.jobs], () => db.jobs.bulkPut(enrichedJobs));
      updatedCount += updatedJobs.length;
      if (updatedJobs.length < batchSize) break;
      offset += updatedJobs.length;
    }

    if (!isSyncAvailable()) return updatedCount;
    await setLastSyncTime(userId, syncStartedAt);
    return updatedCount;
  }));
  const trackedSync = sync.finally(() => {
    if (deltaSyncPromise?.promise === trackedSync) deltaSyncPromise = null;
  });
  deltaSyncPromise = { userId, promise: trackedSync };
  return trackedSync;
}

async function cacheRealtimeJob(
  payload: RealtimePostgresChangesPayload<JobOrderRecord>,
  userId: string,
): Promise<void> {
  if (payload.eventType === 'DELETE') {
    const deletedJobId = payload.old.id;
    if (typeof deletedJobId === 'string') {
      await removeJobFromCache(deletedJobId, userId);
    }
    return;
  }

  const [enriched] = await enrichJobOrders([payload.new]);
  await withCacheUser(userId, [db.jobs], () => db.jobs.put(enriched));
}

export function startRealtimeSync(
  userId: string,
  onError: (error: unknown | null) => void,
): void {
  if (stopRealtimeListener && realtimeUserId === userId) return;
  stopRealtimeSync();
  realtimeUserId = userId;
  let hasConnected = false;
  let lastReconnectSyncAt = 0;

  stopRealtimeListener = subscribeToJobOrderChanges(
    userId,
    (payload) => {
      void cacheRealtimeJob(payload, userId).catch((error: unknown) => {
        console.error('[Realtime] Failed to update the local job cache:', error);
        onError(error);
      });
    },
    (status, error) => {
      if (status === 'SUBSCRIBED') {
        onError(null);
        if (!isSyncAvailable()) return;

        const now = Date.now();
        if (hasConnected && now - lastReconnectSyncAt < RECONNECT_SYNC_MIN_INTERVAL_MS) return;
        hasConnected = true;
        lastReconnectSyncAt = now;

        void performDeltaSync(userId)
          .then(() => repairMissingJobs(userId))
          .catch((syncError: unknown) => {
            console.error('[Sync] Failed to reconcile after Realtime connection:', syncError);
            onError(syncError);
          });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const subscriptionError = error ?? new Error(`Job Realtime subscription ${status.toLowerCase()}`);
        console.error('[Realtime] Job subscription failed:', subscriptionError);
        onError(subscriptionError);
      }
    },
  );
}

export function stopRealtimeSync(): void {
  stopRealtimeListener?.();
  stopRealtimeListener = null;
  realtimeUserId = null;
}

// Force full resync
export async function forceFullResync(userId: string): Promise<void> {
  await runSync(async () => {
    await clearAllData(userId);
    await retrySync(() => syncInitialData(userId));
  });
}

// Update a single job in Dexie after Supabase write
export async function updateJobInCache(jobId: string, userId?: string): Promise<void> {
  if (!userId) {
    throw new Error('A signed-in user is required to update the local job cache');
  }

  const { data: job, error } = await supabase
    .from('job_orders')
    .select(JOB_LIST_COLUMNS)
    .eq('id', jobId)
    .single();
  
  if (error) throw error;
  
  if (job) {
    await cacheJobOrder(job, userId);
  }
}

export async function cacheJobOrder(
  job: JobOrderSyncRecord,
  userId: string,
): Promise<void> {
  const [enriched] = await enrichJobOrders([job]);
  await withCacheUser(userId, [db.jobs], () => db.jobs.put(enriched));
}

export async function patchJobOrderCache(
  jobId: string,
  updates: Partial<DexieJobOrder>,
  userId: string,
): Promise<void> {
  await withCacheUser(userId, [db.jobs], async () => {
    const cachedJob = await db.jobs.get(jobId);
    if (!cachedJob) {
      throw new Error(`Job ${jobId} is missing from the local cache; refresh the job list and retry.`);
    }
    await db.jobs.put({ ...cachedJob, ...updates });
  });
}

export async function removeJobFromCache(jobId: string, userId: string): Promise<void> {
  await withCacheUser(userId, [db.jobs], () => db.jobs.delete(jobId));
}

// Add a new job to Dexie after Supabase insert
export async function addJobToCache(job: JobOrderRecord): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Cannot cache a job without an authenticated user');

  const [enriched] = await enrichJobOrders([job]);
  await withCacheUser(data.user.id, [db.jobs], () => db.jobs.put(enriched));
}

// Check and repair missing and deleted jobs in Dexie
export function repairMissingJobs(userId: string): Promise<number> {
  if (repairSyncPromise?.userId === userId) return repairSyncPromise.promise;

  const sync = runSync(() => retrySync(async () => {
    if (
      lastRepairUserId === userId &&
      Date.now() - lastRepairAt < REPAIR_INTERVAL_MS
    ) {
      return 0;
    }

    // Use keyset pagination so the repair includes every row beyond Supabase's page limit.
    const supabaseJobs: Array<{ id: string }> = [];
    const BATCH_SIZE = 1000;
    let afterId: string | null = null;
    while (true) {
      if (!isSyncAvailable()) return 0;
      let query = supabase
        .from('job_orders')
        .select('id')
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);
      if (afterId) query = query.gt('id', afterId);

      const { data, error } = await query;
      if (error) throw error;
      if (!data) throw new Error('Job ID reconciliation returned no data');
      if (data.length === 0) break;

      supabaseJobs.push(...data);
      afterId = data[data.length - 1].id;
      if (data.length < BATCH_SIZE) break;
    }
    
    // Get all job IDs from Dexie
    const cachedJobs = await db.jobs.toArray();
    const dexieJobIds = new Set(cachedJobs.map((job) => job.id));
    const supabaseJobIds = new Set(supabaseJobs.map((job) => job.id));
    
    const missingJobIds = supabaseJobs
      .filter(job => !dexieJobIds.has(job.id))
      .map(job => job.id);
    const deletedJobIds = cachedJobs
      .filter((job) => !supabaseJobIds.has(job.id))
      .map((job) => job.id);
    if (deletedJobIds.length > 0) {
      await withCacheUser(userId, [db.jobs], () => db.jobs.bulkDelete(deletedJobIds));
    }

    // Fetch and sync missing jobs in batches of 100.
    const MISSING_JOB_BATCH_SIZE = 100;
    for (let i = 0; i < missingJobIds.length; i += MISSING_JOB_BATCH_SIZE) {
      if (!isSyncAvailable()) return 0;
      const batchIds = missingJobIds.slice(i, i + MISSING_JOB_BATCH_SIZE);
      const { data: jobs, error: batchError } = await supabase
        .from('job_orders')
        .select(JOB_LIST_COLUMNS)
        .in('id', batchIds);
      
      if (batchError) throw batchError;
      
      if (jobs && jobs.length > 0) {
        const enrichedJobs = await enrichJobOrders(jobs);
        await withCacheUser(userId, [db.jobs], () => db.jobs.bulkPut(enrichedJobs));
      }
    }

    lastRepairAt = Date.now();
    lastRepairUserId = userId;
    return missingJobIds.length + deletedJobIds.length;
  }));
  const trackedSync = sync.finally(() => {
    if (repairSyncPromise?.promise === trackedSync) repairSyncPromise = null;
  });
  repairSyncPromise = { userId, promise: trackedSync };
  return trackedSync;
}
