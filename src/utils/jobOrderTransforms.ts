import type { DexieJobOrder } from '@/lib/dexieDb';
import type { DashboardJob, JobOrder, JobOrderListRecord } from '@/types/jobOrder';
import { sanitizeHtml } from '@/utils/inputValidation';

export function transformJobOrderData(data: JobOrderListRecord[]): JobOrder[] {
  return data.map((order) => {
    const customer = order.customer
      ? { ...order.customer, name: sanitizeHtml(order.customer.name) }
      : null;
    const designer = order.designer
      ? { ...order.designer, name: sanitizeHtml(order.designer.name) }
      : null;
    const salesman = order.salesman
      ? { ...order.salesman, name: sanitizeHtml(order.salesman.name) }
      : null;
    const jobTitle = order.job_title
      ? { ...order.job_title, job_title_id: sanitizeHtml(order.job_title.job_title_id) }
      : null;
    const details = order.job_order_details || '';

    return {
      ...order,
      customer,
      designer,
      salesman,
      job_title: jobTitle,
      title: jobTitle?.job_title_id || sanitizeHtml(details || `Job Order ${order.job_order_number}`),
      description: sanitizeHtml(details),
    };
  });
}

export function transformCachedJobOrders(orders: DexieJobOrder[]): JobOrder[] {
  return transformJobOrderData(
    orders.map((order) => ({
      id: order.id,
      job_order_number: order.job_order_number,
      customer_id: order.customer_id,
      job_title_id: order.job_title_id ?? null,
      designer_id: order.designer_id ?? null,
      salesman_id: order.salesman_id ?? null,
      status: order.status,
      priority: order.priority,
      branch: order.branch ?? null,
      assignee: order.assignee ?? null,
      due_date: order.due_date ?? null,
      estimated_hours: order.estimated_hours ?? null,
      actual_hours: order.actual_hours ?? null,
      total_value: order.total_value ?? null,
      invoice_number: order.invoice_number ?? null,
      invoiced_at: order.invoiced_at ?? null,
      job_order_details: order.job_order_details ?? null,
      client_name: order.client_name ?? null,
      delivered_at: order.delivered_at ?? null,
      approval_status: order.approval_status,
      approval_notes: order.approval_notes ?? null,
      approved_by: order.approved_by ?? null,
      approved_at: order.approved_at ?? null,
      created_by: order.created_by,
      created_at: order.created_at,
      updated_at: order.updated_at,
      description_plain: order.description_plain ?? null,
      description: null,
      customer: {
        id: order.customer_id,
        name: order.customer_name || 'Unknown Customer',
      },
      job_title: order.job_title_id
        ? { id: order.job_title_id, job_title_id: order.job_title || order.job_title_id }
        : null,
      designer: order.designer_id
        ? {
            id: order.designer_id,
            name: order.designer_name || 'Unknown Designer',
            phone: null,
          }
        : null,
      salesman: order.salesman_id
        ? {
            id: order.salesman_id,
            name: order.salesman_name || 'Unknown Salesman',
            email: null,
            phone: null,
          }
        : null,
    })),
  );
}

export function transformDexieJobOrder(order: DexieJobOrder): DashboardJob {
  const today = new Date().toISOString().split('T')[0];

  return {
    id: order.id,
    jobOrderNumber: order.job_order_number,
    title: order.job_title ?? order.job_title_id ?? `Job Order ${order.job_order_number}`,
    jobOrderDetails: order.job_order_details || '',
    customer: order.customer_name || 'Unknown Customer',
    assignee: order.assignee || 'Unassigned',
    priority: order.priority,
    status: order.status,
    dueDate: order.due_date || today,
    createdAt: order.created_at.split('T')[0] || today,
    estimatedHours: order.estimated_hours || 0,
    branch: order.branch || '',
    designer: order.designer_name || 'Unassigned',
    salesman: order.salesman_name || 'Unassigned',
    totalValue: order.total_value || 0,
    created_by: order.created_by,
    invoiceNumber: order.invoice_number || '',
    invoicedAt: order.invoiced_at || undefined,
    approval_status: order.approval_status,
    deliveredAt: order.delivered_at || '',
    clientName: order.client_name || '',
    customer_id: order.customer_id,
    job_title_id: order.job_title_id ?? undefined,
  };
}
