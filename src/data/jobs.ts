import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { isJobStatus } from '@/types/jobOrder';
import { getCustomerName } from '@/data/customers';
import { getJobTitleName } from '@/data/jobTitles';
import { getProfileName } from '@/data/profiles';
import type {
  Customer,
  Designer,
  JobOrderListRecord,
  JobOrderInsert,
  JobOrderRecord,
  JobOrderUpdate,
  JobStatus,
  JobTitle,
  Salesman,
} from '@/types/jobOrder';

export const JOB_LIST_SELECT =
  'id,job_order_number,customer_id,job_title_id,designer_id,salesman_id,status,priority,branch,assignee,due_date,estimated_hours,actual_hours,total_value,invoice_number,invoiced_at,job_order_details,client_name,delivered_at,approval_status,approval_notes,approved_by,approved_at,created_by,created_at,updated_at,description_plain,customer:customers!fk_job_orders_customer(id,name),job_title:job_titles(id,job_title_id)' as const;

const JOB_CREATE_SELECT = `${JOB_LIST_SELECT},description` as const;

type JobOrderBaseRecord = Omit<JobOrderRecord, 'description'> & {
  customer: Customer | null;
  job_title: JobTitle | null;
};
type ProfileRecord = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'email' | 'phone'>;

interface JobOrderFilters {
  status?: string;
  branch?: string;
  salesman?: string;
  salesmanId?: string;
  customer?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const JOB_DETAILS_COLUMNS =
  'id,job_order_number,customer_id,job_title_id,designer_id,salesman_id,assignee,priority,status,due_date,estimated_hours,created_at,branch,job_order_details,invoice_number,invoiced_at,total_value,created_by,approval_status,delivered_at,client_name';

export interface PendingApprovalJob {
  id: string;
  job_order_number: string;
  customer_name: string;
  created_at: string;
  job_order_details: string;
  created_by_name: string;
}

function uniqueProfileIds(rows: JobOrderBaseRecord[]): string[] {
  return Array.from(
    new Set(
      rows
        .flatMap((row) => [row.designer_id, row.salesman_id])
        .filter((id): id is string => id !== null),
    ),
  );
}

async function enrichWithProfiles(rows: JobOrderBaseRecord[]): Promise<JobOrderListRecord[]> {
  const profileIds = uniqueProfileIds(rows);
  const profiles: ProfileRecord[] = [];

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', profileIds);

    if (error) throw error;
    profiles.push(...(data || []));
  }

  const profileMap = new Map<string, ProfileRecord>();
  profiles.forEach((profile) => profileMap.set(profile.id, profile));

  return rows.map((jobOrder) => {
    const designerProfile = jobOrder.designer_id
      ? profileMap.get(jobOrder.designer_id)
      : undefined;
    const salesmanProfile = jobOrder.salesman_id
      ? profileMap.get(jobOrder.salesman_id)
      : undefined;

    const designer: Designer | null = designerProfile
      ? {
          id: designerProfile.id,
          name: designerProfile.full_name || 'Unknown Designer',
          phone: designerProfile.phone,
        }
      : null;
    const salesman: Salesman | null = salesmanProfile
      ? {
          id: salesmanProfile.id,
          name: salesmanProfile.full_name || 'Unknown Salesman',
          email: salesmanProfile.email,
          phone: salesmanProfile.phone,
        }
      : null;

    return { ...jobOrder, designer, salesman };
  });
}

export async function fetchJobOrdersPaginated(
  page = 1,
  pageSize = 50,
  filters: JobOrderFilters = {},
): Promise<{
  data: JobOrderListRecord[];
  totalCount: number;
  totalPages: number;
}> {
  const salesmanFilter = filters.salesman?.trim();
  const customerFilter = filters.customer?.trim();

  let salesmanIds: string[] | undefined;
  if (
    !filters.salesmanId &&
    salesmanFilter &&
    salesmanFilter !== 'all'
  ) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('full_name', salesmanFilter);

    if (error) throw error;
    salesmanIds = (data || []).map((profile) => profile.id);
    if (salesmanIds.length === 0) {
      return { data: [], totalCount: 0, totalPages: 0 };
    }
  }

  let customerIds: string[] | undefined;
  if (
    !filters.customerId &&
    customerFilter &&
    customerFilter !== 'all'
  ) {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('name', customerFilter);

    if (error) throw error;
    customerIds = (data || []).map((customer) => customer.id);
    if (customerIds.length === 0) {
      return { data: [], totalCount: 0, totalPages: 0 };
    }
  }

  let query = supabase
    .from('job_orders')
    .select(JOB_LIST_SELECT, { count: 'exact' });

  if (filters.status && filters.status !== 'all') {
    if (!isJobStatus(filters.status)) {
      throw new Error(`Unsupported job status filter: ${filters.status}`);
    }
    query = query.eq('status', filters.status);
  }

  if (filters.branch && filters.branch !== 'all') {
    query = query.ilike('branch', `%${filters.branch}%`);
  }

  if (filters.salesmanId && filters.salesmanId !== 'all') {
    query = query.eq('salesman_id', filters.salesmanId);
  } else if (salesmanIds) {
    query = query.in('salesman_id', salesmanIds);
  }
  if (filters.customerId && filters.customerId !== 'all') {
    query = query.eq('customer_id', filters.customerId);
  } else if (customerIds) {
    query = query.in('customer_id', customerIds);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  if (filters.search?.trim()) {
    const searchTerm = filters.search.trim();
    query = query.or(
      `job_order_number.ilike.%${searchTerm}%,job_order_details.ilike.%${searchTerm}%,client_name.ilike.%${searchTerm}%,assignee.ilike.%${searchTerm}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const enrichedData = await enrichWithProfiles(data || []);

  const totalCount = count || 0;
  return {
    data: enrichedData,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function updateJobOrder(
  id: string,
  updates: JobOrderUpdate,
): Promise<Omit<JobOrderRecord, 'description'>> {
  if (!navigator.onLine) {
    throw new Error('You are offline. Reconnect before saving this job order.');
  }

  const { data, error } = await supabase
    .from('job_orders')
    .update(updates)
    .eq('id', id)
    .select(JOB_LIST_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export function updateJobOrderStatus(
  id: string,
  status: JobStatus,
): Promise<Omit<JobOrderRecord, 'description'>> {
  return updateJobOrder(id, { status, updated_at: new Date().toISOString() });
}

export async function updateJobFields(id: string, updates: JobOrderUpdate): Promise<void> {
  const { error } = await supabase.from('job_orders').update(updates).eq('id', id);
  if (error) throw error;
}

export async function generateNextJobOrderNumber(branch: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_next_job_order_number', {
    p_branch: branch,
  });

  if (error) throw error;
  return data;
}

export async function insertJobOrder(values: JobOrderInsert) {
  const { data, error } = await supabase
    .from('job_orders')
    .insert(values)
    .select(JOB_CREATE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePendingJobApproval(
  id: string,
  userId: string,
  approvedAt: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('job_orders')
    .update({
      approval_status: 'approved',
      approved_by: userId,
      approved_at: approvedAt,
      updated_at: approvedAt,
    })
    .eq('id', id)
    .eq('approval_status', 'pending_approval')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('This job is no longer awaiting approval.');
}

export async function updateJobApproval(
  id: string,
  approvalStatus: 'approved' | 'rejected',
  userId: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('job_orders')
    .update({
      approval_status: approvalStatus,
      approved_by: userId,
      approved_at: approvalStatus === 'approved' ? now : null,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function getJobOrderForDetails(id: string) {
  const { data, error } = await supabase
    .from('job_orders')
    .select(JOB_DETAILS_COLUMNS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getJobOrderDetails(id: string) {
  const job = await getJobOrderForDetails(id);
  const [customerName, designerName, salesmanName, jobTitleName] = await Promise.all([
    getCustomerName(job.customer_id),
    job.designer_id ? getProfileName(job.designer_id) : null,
    job.salesman_id ? getProfileName(job.salesman_id) : null,
    job.job_title_id ? getJobTitleName(job.job_title_id) : null,
  ]);

  return {
    ...job,
    customer_name: customerName,
    designer_name: designerName,
    salesman_name: salesmanName,
    job_title_name: jobTitleName,
  };
}

export async function listPendingApprovalJobs(): Promise<PendingApprovalJob[]> {
  const pageSize = 500;
  const jobs: Array<{
    id: string;
    job_order_number: string;
    job_order_details: string | null;
    created_at: string;
    created_by: string | null;
    customer: { name: string } | null;
  }> = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('job_orders')
      .select(`
        id, job_order_number, job_order_details, created_at, created_by,
        customer:customers!fk_job_orders_customer(name)
      `)
      .eq('approval_status', 'pending_approval')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (data.length === 0) break;
    jobs.push(...data);
    offset += data.length;
    if (data.length < pageSize) break;
  }

  const creatorIds = Array.from(
    new Set(jobs.map((job) => job.created_by).filter((id): id is string => id !== null)),
  );
  const creatorNames = new Map<string, string | null>();
  if (creatorIds.length > 0) {
    const { data: creators, error: creatorsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);
    if (creatorsError) throw creatorsError;
    creators.forEach((profile) => creatorNames.set(profile.id, profile.full_name));
  }

  return jobs.map((job) => ({
    id: job.id,
    job_order_number: job.job_order_number,
    customer_name: job.customer?.name || 'Unknown Customer',
    created_at: job.created_at,
    job_order_details: job.job_order_details || '',
    created_by_name: (job.created_by && creatorNames.get(job.created_by)) || 'Unknown User',
  }));
}

export async function updateJobStatusThroughRpc(
  jobId: string,
  status: JobStatus,
): Promise<{ success: boolean; error?: string; job_order_number?: string }> {
  const { data, error } = await supabase.rpc('update_job_status', {
    p_job_id: jobId,
    p_new_status: status,
  });

  if (error) throw error;
  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.success !== 'boolean'
  ) {
    throw new Error('Status update returned an invalid response');
  }

  return {
    success: data.success,
    ...(typeof data.error === 'string' ? { error: data.error } : {}),
    ...(typeof data.job_order_number === 'string'
      ? { job_order_number: data.job_order_number }
      : {}),
  };
}

export async function getJobReportPage(
  startDate: string,
  endDate: string,
  afterId: string | null,
  pageSize: number,
) {
  let query = supabase
    .from('job_orders')
    .select(`
      id, status, branch, total_value,
      customers!fk_job_orders_customer(name),
      salesman_profiles:profiles!fk_job_orders_salesman(full_name)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('id', { ascending: true })
    .limit(pageSize);

  if (afterId) query = query.gt('id', afterId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getJobCreationDatesPage(
  startDate: string,
  endDate: string,
  afterId: string | null,
  pageSize: number,
) {
  let query = supabase
    .from('job_orders')
    .select('id, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('id', { ascending: true })
    .limit(pageSize);

  if (afterId) query = query.gt('id', afterId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listJobCreationDates(startDate: string, endDate: string) {
  const pageSize = 500;
  const jobs: Array<{ id: string; created_at: string }> = [];
  let afterId: string | null = null;

  while (true) {
    const page = await getJobCreationDatesPage(startDate, endDate, afterId, pageSize);
    if (page.length === 0) break;
    jobs.push(...page);
    afterId = page[page.length - 1].id;
    if (page.length < pageSize) break;
  }

  return jobs;
}

export async function listJobOrdersForExport() {
  const pageSize = 1000;
  const jobs: Array<{
    job_order_number: string;
    customer_id: string;
    job_title_id: string | null;
    designer_id: string | null;
    salesman_id: string | null;
    priority: string;
    status: string;
    approval_status: string;
    branch: string | null;
    due_date: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    job_order_details: string | null;
    invoice_number: string | null;
    delivered_at: string | null;
    client_name: string | null;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('job_orders')
      .select(`
        job_order_number, customer_id, job_title_id, designer_id, salesman_id,
        priority, status, approval_status, branch, due_date, estimated_hours,
        actual_hours, job_order_details, invoice_number, delivered_at, client_name,
        created_at, updated_at
      `)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    jobs.push(...data);
    if (data.length < pageSize) break;
  }

  return jobs;
}
