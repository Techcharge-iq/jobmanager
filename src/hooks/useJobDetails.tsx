import { useState, useEffect, useRef } from "react";
import { Job } from "@/pages/Index";
import { getProfileRole } from "@/data/profiles";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/contexts/NotificationContext";
import { shareJobOrderViaWhatsApp } from "@/utils/whatsappShare";
import { updateJobOrder } from "@/services/jobOrdersApi";
import { cacheJobOrder } from "@/services/syncService";
import type { JobOrderUpdate } from "@/types/jobOrder";

interface UseJobDetailsProps {
  job: Job | null;
  isEditMode: boolean;
  onClose: () => void;
  isOpen?: boolean; // Added optional isOpen prop
}

export function useJobDetails({ job, isEditMode, onClose, isOpen = true }: UseJobDetailsProps) {
  const [editData, setEditData] = useState<Partial<Job>>({});
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const roleLoadedFor = useRef<string | null>(null);
  const initializedJobId = useRef<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  // Check if user is authorized to edit invoice numbers
  const canEditInvoice = userRole === 'admin' || userRole === 'manager' || userRole === 'job_order_manager';

  const notifyInvoiceCompletion = (normalizedInvoiceNumber: string) => {
    if (!job || job.status === "invoiced") return;

    addNotification({
      type: "invoice_completed",
      message: `Job #${job.jobOrderNumber} has been invoiced (Invoice #${normalizedInvoiceNumber}).`,
      jobOrderNumber: job.jobOrderNumber,
      read: false,
    });
  };

  useEffect(() => {
    if (!job || initializedJobId.current === job.id) return;
    initializedJobId.current = job.id;
    setEditData({
      title: job.title,
      priority: job.priority,
      dueDate: job.dueDate,
      estimatedHours: job.estimatedHours,
      branch: job.branch,
      jobOrderDetails: job.jobOrderDetails,
      customer_id: job.customer_id,
      job_title_id: job.job_title_id,
      deliveredAt: job.deliveredAt
    });

    setInvoiceNumber(job.invoiceNumber || '');
  }, [job]);

  useEffect(() => {
    if (!user?.id) {
      setUserRole('');
      roleLoadedFor.current = null;
      return;
    }
    if (roleLoadedFor.current !== user.id) setUserRole('');
    if (!job?.id || !isOpen || roleLoadedFor.current === user.id) return;
    let active = true;

    const loadRole = async () => {
      try {
        const role = await getProfileRole(user.id);
        if (active && role) {
          roleLoadedFor.current = user.id;
          setUserRole(role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    void loadRole();

    return () => {
      active = false;
    };
  }, [user?.id, job?.id, isOpen]);

  const handleSave = async () => {
    if (!job) return;

    const updateData: JobOrderUpdate = {};
    if (editData.priority !== job.priority) updateData.priority = editData.priority;
    if (editData.dueDate !== job.dueDate) updateData.due_date = editData.dueDate;
    if (editData.estimatedHours !== job.estimatedHours) {
      updateData.estimated_hours = editData.estimatedHours;
    }
    if (editData.branch !== job.branch) updateData.branch = editData.branch;
    if (editData.jobOrderDetails !== job.jobOrderDetails) {
      updateData.job_order_details = editData.jobOrderDetails;
    }
    if (editData.deliveredAt !== job.deliveredAt) {
      updateData.delivered_at = editData.deliveredAt;
    }
    if (editData.customer_id && editData.customer_id !== job.customer_id) {
      updateData.customer_id = editData.customer_id;
    }
    if (editData.job_title_id && editData.job_title_id !== job.job_title_id) {
      updateData.job_title_id = editData.job_title_id;
    }

    // Only include invoice_number if user is authorized
    if (canEditInvoice) {
      const normalizedInvoiceNumber = invoiceNumber.trim();
      if (normalizedInvoiceNumber !== (job.invoiceNumber || "")) {
        updateData.invoice_number = normalizedInvoiceNumber || null;
      }
      if (normalizedInvoiceNumber && job.status !== "invoiced") {
        updateData.status = 'invoiced';
      }
    }

    if (Object.keys(updateData).length === 0) {
      onClose();
      return;
    }
    updateData.updated_at = new Date().toISOString();

    setIsLoading(true);
    try {
      if (!user) throw new Error("A signed-in user is required to save job changes.");
      const updatedJob = await updateJobOrder(job.id, updateData);
      await cacheJobOrder(updatedJob, user.id);

      const normalizedInvoiceNumber = invoiceNumber.trim();
      if (canEditInvoice && normalizedInvoiceNumber) notifyInvoiceCompletion(normalizedInvoiceNumber);

      toast({
        title: "Success",
        description: "Job order updated successfully",
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating job:', error);

      toast({
        title: "Error",
        description: "Failed to update job order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!job) return;

    setIsExporting(true);
    try {
      const normalizedInvoiceNumber = invoiceNumber.trim();
      if (normalizedInvoiceNumber && normalizedInvoiceNumber !== job.invoiceNumber && canEditInvoice) {
        if (!user) throw new Error("A signed-in user is required to save the invoice.");
        const updatedJob = await updateJobOrder(job.id, {
          invoice_number: normalizedInvoiceNumber,
          status: 'invoiced',
          updated_at: new Date().toISOString(),
        });
        await cacheJobOrder(updatedJob, user.id);
        
        notifyInvoiceCompletion(normalizedInvoiceNumber);
      }

      const { exportJobOrderToPDF } = await import("@/utils/pdfExport");
      await exportJobOrderToPDF(job, invoiceNumber);
      toast({
        title: "Success",
        description: "Job order exported to PDF successfully",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!job) return;

    setIsSharing(true);
    try {
      const normalizedInvoiceNumber = invoiceNumber.trim();
      if (normalizedInvoiceNumber && normalizedInvoiceNumber !== job.invoiceNumber && canEditInvoice) {
        if (!user) throw new Error("A signed-in user is required to save the invoice.");
        const updatedJob = await updateJobOrder(job.id, {
          invoice_number: normalizedInvoiceNumber,
          status: 'invoiced',
          updated_at: new Date().toISOString(),
        });
        await cacheJobOrder(updatedJob, user.id);
        
        notifyInvoiceCompletion(normalizedInvoiceNumber);
      }

      await shareJobOrderViaWhatsApp(job, invoiceNumber);
      toast({
        title: "Success",
        description: "Job order shared via WhatsApp successfully",
      });
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      toast({
        title: "Error",
        description: "Failed to share via WhatsApp. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return {
    editData,
    setEditData,
    invoiceNumber,
    setInvoiceNumber,
    isLoading,
    isExporting,
    isSharing,
    canEditInvoice,
    handleSave,
    handleExportPDF,
    handleShareWhatsApp
  };
}