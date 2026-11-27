import { Constants, type Tables, type TablesInsert, type TablesUpdate } from '@/integrations/supabase/types';

export type JobOrderRecord = Tables<'job_orders'>;
export type JobOrderInsert = TablesInsert<'job_orders'>;
export type JobOrderUpdate = TablesUpdate<'job_orders'>;
export type JobStatus = JobOrderRecord['status'];
export type JobPriority = JobOrderRecord['priority'];
export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';
const JOB_STATUS_VALUES: ReadonlySet<string> = new Set(Constants.public.Enums.job_status);

export function isJobStatus(value: string): value is JobStatus {
  return JOB_STATUS_VALUES.has(value);
}

export interface Customer {
  id: string;
  name: string;
}

export interface Designer {
  id: string;
  name: string;
  phone: string | null;
}

export interface Salesman {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface JobTitle {
  id: string;
  job_title_id: string;
}

export type JobOrderListRecord = Omit<JobOrderRecord, 'description'> & {
  customer: Customer | null;
  job_title: JobTitle | null;
  designer: Designer | null;
  salesman: Salesman | null;
};

export type JobOrder = JobOrderListRecord & {
  title: string;
  description: string;
};

export interface DashboardJob {
  id: string;
  jobOrderNumber: string;
  title: string;
  customer: string;
  assignee?: string;
  designer?: string;
  salesman?: string;
  priority: JobPriority;
  status: JobStatus;
  dueDate: string;
  estimatedHours: number;
  createdAt: string;
  branch?: string;
  jobOrderDetails?: string;
  invoiceNumber?: string;
  invoicedAt?: string;
  totalValue?: number;
  customer_id?: string;
  job_title_id?: string;
  created_by?: string;
  approval_status?: string;
  deliveredAt?: string;
  clientName?: string;
}

export type JobOrderUpdatePayload = {
  id: string;
} & JobOrderUpdate;

export interface CreateJobOrderData {
  customer_id: NonNullable<JobOrderInsert['customer_id']>;
  job_title_id: NonNullable<JobOrderInsert['job_title_id']>;
  designer_id: NonNullable<JobOrderInsert['designer_id']>;
  salesman_id: NonNullable<JobOrderInsert['salesman_id']>;
  assignee: NonNullable<JobOrderInsert['assignee']>;
  priority: JobPriority;
  status: JobStatus;
  due_date: NonNullable<JobOrderInsert['due_date']>;
  estimated_hours: NonNullable<JobOrderInsert['estimated_hours']>;
  branch: NonNullable<JobOrderInsert['branch']>;
  job_order_details: NonNullable<JobOrderInsert['job_order_details']>;
  delivered_at?: JobOrderInsert['delivered_at'];
  client_name?: JobOrderInsert['client_name'];
}
