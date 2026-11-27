import Dexie, { Table } from 'dexie';
import type { JobOrderRecord } from '@/types/jobOrder';

export type DexieJobOrder = Pick<
  JobOrderRecord,
  'id' | 'job_order_number' | 'customer_id' | 'status' | 'priority' |
  'approval_status' | 'created_by' | 'created_at' | 'updated_at'
> & Partial<
  Pick<
    JobOrderRecord,
    | 'job_title_id'
    | 'designer_id'
    | 'salesman_id'
    | 'branch'
    | 'assignee'
    | 'due_date'
    | 'estimated_hours'
    | 'actual_hours'
    | 'total_value'
    | 'invoice_number'
    | 'invoiced_at'
    | 'job_order_details'
    | 'client_name'
    | 'delivered_at'
    | 'approval_notes'
    | 'approved_by'
    | 'approved_at'
    | 'description_plain'
  >
> & {
  customer_name?: string;
  job_title?: string;
  designer_name?: string;
  salesman_name?: string;
  is_synced?: boolean;
};

export interface DexieCustomer {
  id: string;
  name: string;
}

export interface DexieSalesman {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface DexieDesigner {
  id: string;
  name: string;
  phone?: string;
}

export interface DexieJobTitle {
  id: string;
  job_title_id: string;
}

export interface DexieSyncMeta {
  id: string;
  lastSyncTime?: string;
  syncInProgress?: boolean;
  ownerUserId?: string | null;
}

export interface DexieJobEditAudit {
  id: string;
  job_id: string;
  job_order_number: string;
  edited_by: string;
  edited_by_name?: string;
  edited_role?: string;
  diff: Record<string, unknown>;
  created_at: string;
}

export interface DexieNotification {
  id: string;
  user_id: string;
  job_id: string | null;
  type: string;
  message: string;
  payload: Record<string, unknown>;
  read: boolean;
  snoozed_until: string | null;
  created_at: string;
}

export interface DexieDailyChecklist {
  id: string;
  date: string;
  items: {
    stuck_jobs: Array<{ job_id: string; reason: string }>;
    clusters: Array<{ name: string; count: number }>;
    checklist: Array<{ id: string; text: string; actionable: boolean; done?: boolean }>;
    clients: Array<{ client_name: string; note: string }>;
  };
  created_at: string;
}

class JobOrderDatabase extends Dexie {
  jobs!: Table<DexieJobOrder>;
  customers!: Table<DexieCustomer>;
  salesmen!: Table<DexieSalesman>;
  designers!: Table<DexieDesigner>;
  jobTitles!: Table<DexieJobTitle>;
  syncMeta!: Table<DexieSyncMeta>;
  jobEditAudit!: Table<DexieJobEditAudit>;
  notifications!: Table<DexieNotification>;
  dailyChecklists!: Table<DexieDailyChecklist>;

  constructor() {
    super('JobOrderDB');
    
    this.version(4).stores({
      jobs: 'id, job_order_number, customer_id, customer_name, salesman_id, salesman_name, designer_id, status, branch, priority, created_at, updated_at, is_synced',
      customers: 'id, name',
      salesmen: 'id, name',
      designers: 'id, name',
      jobTitles: 'id, job_title_id',
      syncMeta: 'id',
      jobEditAudit: 'id, job_id, created_at',
      notifications: 'id, user_id, job_id, type, read, created_at',
      dailyChecklists: 'id, date, created_at'
    });
  }
}

export const db = new JobOrderDatabase();

export async function withCacheUser<T>(
  userId: string,
  tables: Table[],
  operation: () => Promise<T>,
): Promise<T> {
  return db.transaction('rw', [db.syncMeta, ...tables], async () => {
    const owner = await db.syncMeta.get('main');
    if (owner?.ownerUserId !== userId) {
      throw new Error('The local cache no longer belongs to the active user');
    }
    return operation();
  });
}

const cacheTables = [
  db.jobs,
  db.customers,
  db.salesmen,
  db.designers,
  db.jobTitles,
  db.jobEditAudit,
  db.notifications,
  db.dailyChecklists,
] as const;

let cacheOwnerChange: Promise<void> = Promise.resolve();

export function activateCacheForUser(userId: string | null): Promise<void> {
  const change = cacheOwnerChange.then(() =>
    db.transaction('rw', [...cacheTables, db.syncMeta], async () => {
      const owner = await db.syncMeta.get('main');
      if (owner && owner.ownerUserId === userId) return;

      await Promise.all(cacheTables.map((table) => table.clear()));
      await db.syncMeta.clear();
      await db.syncMeta.put({ id: 'main', ownerUserId: userId });
    }),
  );
  cacheOwnerChange = change.catch(() => undefined);
  return change;
}

// Helper to clear all data (useful for full resync)
export async function clearAllData(userId: string) {
  await withCacheUser(userId, [...cacheTables], async () => {
    await Promise.all(cacheTables.map((table) => table.clear()));
    await db.syncMeta.clear();
    await db.syncMeta.put({ id: 'main', ownerUserId: userId });
  });
}
