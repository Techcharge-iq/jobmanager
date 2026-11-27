import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JobTitleDropdown } from "@/components/dropdowns/JobTitleDropdown";
import { ImageUploader } from "@/components/image-upload/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { useCreateJobOrder } from "@/hooks/useCreateJobOrder";
import { useDropdownData } from "@/hooks/useDropdownData";
import { BranchSection } from "./BranchSection";
import { CustomerSection } from "./CustomerSection";
import { DeliveredAtSection } from "./DeliveredAtSection";
import { JobDetailsSection } from "./JobDetailsSection";
import { JobOrderDetailsSection } from "./JobOrderDetailsSection";
import { ProjectDetailsSection } from "./ProjectDetailsSection";
import { ScheduleSection } from "./ScheduleSection";
import { TeamSection } from "./TeamSection";

type FormStage = 1 | 2 | 3 | 4 | 5;
type JobItem = {
  job_title_id: string;
  description: string;
  quantity: number;
};

interface JobFormData {
  customer: string;
  jobTitle: string;
  assignee: string;
  designer: string;
  salesman: string;
  priority: string;
  status: string;
  dueDate: string;
  estimatedHours: number;
  branch: string;
  deliveredAt: string;
  jobOrderDetails: string;
  clientName: string;
}

const STAGES: { id: FormStage; title: string; description: string }[] = [
  { id: 1, title: "Customer", description: "Choose the customer for this job." },
  { id: 2, title: "Job details", description: "Set the job title and add specifications." },
  { id: 3, title: "Team & branch", description: "Choose where the work belongs and who owns it." },
  { id: 4, title: "Schedule", description: "Set the target date, effort, status, and priority." },
  { id: 5, title: "Review", description: "Check the details before creating the job." },
];

const FIELD_LABELS: Record<string, string> = {
  customer: "Select a customer.",
  jobTitle: "Select a job title.",
  branch: "Select a branch.",
  designer: "Select a designer.",
  salesman: "Select a salesman.",
  priority: "Select a priority.",
  status: "Select a status.",
  dueDate: "Enter a due date.",
  estimatedHours: "Enter a valid estimated-hours value.",
};

const CASH_CUSTOMER_ID = "00000000-0000-0000-0000-000000000001";

function createInitialFormData(): JobFormData {
  return {
    customer: "",
    jobTitle: "",
    assignee: "",
    designer: "",
    salesman: "",
    priority: "medium",
    status: "pending",
    dueDate: new Date().toISOString().split("T")[0],
    estimatedHours: 8,
    branch: "Head Office",
    deliveredAt: "",
    jobOrderDetails: "",
    clientName: "",
  };
}

function getStageErrors(stage: FormStage, data: JobFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const addError = (field: string, invalid: boolean) => {
    if (invalid) errors[field] = FIELD_LABELS[field];
  };

  if (stage === 1) addError("customer", !data.customer);
  if (stage === 2) addError("jobTitle", !data.jobTitle);
  if (stage === 3) {
    addError("branch", !data.branch);
    addError("designer", !data.designer);
    addError("salesman", !data.salesman);
  }
  if (stage === 4) {
    addError("priority", !data.priority);
    addError("status", !data.status);
    addError("dueDate", !data.dueDate);
    addError("estimatedHours", !Number.isFinite(data.estimatedHours));
  }

  return errors;
}

function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b py-2 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium">
        {children === null || children === undefined || children === "" ? "—" : children}
      </dd>
    </div>
  );
}

interface JobFormWithImageUploadProps {
  onCancel?: () => void;
  onCreatingChange?: (creating: boolean) => void;
}

export function JobFormWithImageUpload({ onCancel, onCreatingChange }: JobFormWithImageUploadProps) {
  const { toast } = useToast();
  const { createJobOrder, isCreating } = useCreateJobOrder();
  const { customers, designers, salesmen, jobTitles } = useDropdownData();
  const [currentStage, setCurrentStage] = useState<FormStage>(1);
  const [isUploadStage, setIsUploadStage] = useState(false);
  const [maxReachedStage, setMaxReachedStage] = useState<FormStage>(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<JobFormData>(createInitialFormData);
  const [customerLabel, setCustomerLabel] = useState("");
  const [jobTitleLabel, setJobTitleLabel] = useState("");
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const submissionGuard = useRef(false);

  const updateFormData = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const focusFirstError = (errors: Record<string, string>) => {
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      window.requestAnimationFrame(() => document.getElementById(firstField)?.focus());
    }
  };

  const moveToStage = (target: FormStage) => {
    if (target === currentStage) return;
    if (target > currentStage) {
      for (const stage of STAGES) {
        if (stage.id >= target) break;
        const errors = getStageErrors(stage.id, formData);
        if (Object.keys(errors).length > 0) {
          setCurrentStage(stage.id);
          setValidationErrors(errors);
          focusFirstError(errors);
          return;
        }
      }
      setMaxReachedStage((highest) => Math.max(highest, target) as FormStage);
    }

    setValidationErrors({});
    setCurrentStage(target);
  };

  const getFirstInvalidStage = () => STAGES.find((stage) => {
    return Object.keys(getStageErrors(stage.id, formData)).length > 0;
  });

  const finishForm = () => {
    setFormData(createInitialFormData());
    setCustomerLabel("");
    setJobTitleLabel("");
    setJobItems([]);
    setCreatedJobId(null);
    setIsUploadStage(false);
    setValidationErrors({});
    setCurrentStage(1);
    setMaxReachedStage(1);
    submissionGuard.current = false;
    onCancel?.();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionGuard.current || isCreating) return;

    const invalidStage = getFirstInvalidStage();
    if (invalidStage) {
      setCurrentStage(invalidStage.id);
      const errors = getStageErrors(invalidStage.id, formData);
      setValidationErrors(errors);
      focusFirstError(errors);
      return;
    }

    submissionGuard.current = true;
    onCreatingChange?.(true);
    try {
      const newJob = await createJobOrder({
        customer_id: formData.customer,
        job_title_id: formData.jobTitle,
        designer_id: formData.designer,
        salesman_id: formData.salesman,
        assignee: formData.assignee,
        priority: formData.priority as "low" | "medium" | "high",
        status: formData.status as "pending" | "in-progress" | "designing" | "completed" | "finished" | "cancelled" | "invoiced",
        due_date: formData.dueDate,
        estimated_hours: formData.estimatedHours,
        branch: formData.branch,
        delivered_at: formData.deliveredAt,
        job_order_details: formData.jobOrderDetails,
        client_name: formData.clientName,
      });

      setCreatedJobId(newJob.id);
      setIsUploadStage(true);
    } catch (error) {
      submissionGuard.current = false;
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Error",
        description: `Failed to create job order: ${message}`,
        variant: "destructive",
      });
    } finally {
      onCreatingChange?.(false);
    }
  };

  if (isUploadStage && createdJobId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Upload job images</h2>
            <p className="text-sm text-muted-foreground">
              The job has been created. Add artwork or reference images now, or finish without uploading.
            </p>
          </div>
          <ImageUploader
            jobOrderId={createdJobId}
            onUploadComplete={finishForm}
            maxFiles={10}
          />
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={finishForm}>
              Finish without uploading
            </Button>
            <Button type="button" onClick={finishForm}>
              Finish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stage = STAGES[currentStage - 1];
  const selectedCustomer = customers.find((customer) => customer.id === formData.customer);
  const selectedJobTitle = jobTitles.find((jobTitle) => jobTitle.id === formData.jobTitle);
  const selectedDesigner = designers.find((designer) => designer.id === formData.designer);
  const selectedSalesman = salesmen.find((salesman) => salesman.id === formData.salesman);

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <nav aria-label="Job creation steps" className="shrink-0 border-b px-3 py-3 sm:px-6">
        <ol className="grid grid-cols-5 gap-1 sm:gap-2">
          {STAGES.map((item) => {
            const active = item.id === currentStage;
            const completed = item.id < currentStage &&
              Object.keys(getStageErrors(item.id, formData)).length === 0;
            const canOpen = item.id <= maxReachedStage;

            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-label={`Step ${item.id}: ${item.title}${active ? ", current" : completed ? ", completed" : ", incomplete"}`}
                  disabled={!canOpen || isCreating}
                  onClick={() => moveToStage(item.id)}
                  className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-1.5 text-start text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-2"
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : completed
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                  }`}>
                    {completed ? <Check className="h-3.5 w-3.5" aria-hidden /> : item.id}
                  </span>
                  <span className={`hidden min-w-0 truncate sm:block ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    <span className="block truncate">{item.title}</span>
                    <span className="block text-[10px] font-normal">
                      {active ? "Current" : completed ? "Complete" : "Incomplete"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        {stage && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Step {stage.id} of 5</p>
            <h2 className="mt-1 text-lg font-semibold">{stage.title}</h2>
            <p className="text-sm text-muted-foreground">{stage.description}</p>
          </div>
        )}

        {Object.keys(validationErrors).length > 0 && (
          <div role="alert" aria-live="assertive" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <p className="font-medium">Complete the required fields to continue:</p>
            <ul className="mt-1 list-inside list-disc">
              {Object.values(validationErrors).map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}

        <section hidden={currentStage !== 1} aria-label="Customer information" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Customer information</h3>
              </div>
              <CustomerSection
                value={formData.customer}
                onChange={(value) => updateFormData("customer", value)}
                customers={customers}
                clientName={formData.clientName}
                onClientNameChange={(value) => updateFormData("clientName", value)}
                onCustomerNameChange={setCustomerLabel}
              />
              <p className="text-xs text-muted-foreground">
                Contact and billing fields are not available in the existing customer data used by this form.
              </p>
            </CardContent>
          </Card>
        </section>

        <section hidden={currentStage !== 2} aria-label="Job details and specifications" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Job details</h3>
              </div>
              <JobDetailsSection
                jobTitle={formData.jobTitle}
                assignee={formData.assignee}
                onJobTitleChange={(value) => updateFormData("jobTitle", value)}
                onJobTitleNameChange={setJobTitleLabel}
                onAssigneeChange={(value) => updateFormData("assignee", value)}
                jobTitles={jobTitles}
                hideAssignee
              />
              <JobOrderDetailsSection
                value={formData.jobOrderDetails}
                onChange={(value) => updateFormData("jobOrderDetails", value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold">Job items (optional)</h3>
                <p className="text-xs text-muted-foreground">
                  These rows are not sent by the current job-creation API. Put any required specifications in Job Order Details.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setJobItems((items) => [...items, { job_title_id: "", description: "", quantity: 1 }])}
              >
                Add item
              </Button>
              {jobItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items added.</p>
              ) : (
                <div className="space-y-3">
                  {jobItems.map((item, index) => (
                    <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Item #{index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove item ${index + 1}`}
                            onClick={() => setJobItems((items) => items.filter((_, currentIndex) => currentIndex !== index))}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium" htmlFor={`job-item-title-${index}`}>Item name *</label>
                          <JobTitleDropdown
                            id={`job-item-title-${index}`}
                            value={item.job_title_id}
                            onValueChange={(value) => setJobItems((items) => items.map((current, currentIndex) =>
                              currentIndex === index ? { ...current, job_title_id: value } : current
                            ))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium" htmlFor={`job-item-description-${index}`}>Description *</label>
                          <Textarea
                            id={`job-item-description-${index}`}
                            value={item.description}
                            onChange={(event) => setJobItems((items) => items.map((current, currentIndex) =>
                              currentIndex === index ? { ...current, description: event.target.value } : current
                            ))}
                            placeholder="Describe the work"
                            rows={2}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor={`job-item-quantity-${index}`}>Quantity</label>
                        <Input
                          id={`job-item-quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => {
                            const quantity = Number.parseInt(event.target.value, 10) || 1;
                            setJobItems((items) => items.map((current, currentIndex) =>
                              currentIndex === index ? { ...current, quantity } : current
                            ));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section hidden={currentStage !== 3} aria-label="Team and branch assignment" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Team and branch</h3>
              </div>
              <BranchSection
                value={formData.branch}
                onChange={(value) => updateFormData("branch", value)}
              />
              <TeamSection
                designer={formData.designer}
                salesman={formData.salesman}
                onDesignerChange={(value) => updateFormData("designer", value)}
                onSalesmanChange={(value) => updateFormData("salesman", value)}
                designers={designers}
                salesmen={salesmen}
              />
              <div className="space-y-1.5">
                <label htmlFor="assignee" className="text-sm font-medium">Assignee</label>
                <Input
                  id="assignee"
                  value={formData.assignee}
                  onChange={(event) => updateFormData("assignee", event.target.value)}
                  placeholder="Assignee"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section hidden={currentStage !== 4} aria-label="Schedule and priority" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Schedule and priority</h3>
              </div>
              <ProjectDetailsSection
                priority={formData.priority}
                status={formData.status}
                onPriorityChange={(value) => updateFormData("priority", value)}
                onStatusChange={(value) => updateFormData("status", value)}
              />
              <ScheduleSection
                dueDate={formData.dueDate}
                estimatedHours={formData.estimatedHours}
                onDueDateChange={(value) => updateFormData("dueDate", value)}
                onEstimatedHoursChange={(value) => updateFormData("estimatedHours", value)}
              />
              <div className="max-w-sm">
                <p className="mb-1.5 text-sm font-medium">Delivered at</p>
                <DeliveredAtSection
                  value={formData.deliveredAt}
                  onChange={(value) => updateFormData("deliveredAt", value)}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section hidden={currentStage !== 5} aria-label="Review job details" className="space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Customer</h3>
              </div>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <SummaryField label="Customer">{selectedCustomer?.name || customerLabel || formData.customer}</SummaryField>
                {formData.customer === CASH_CUSTOMER_ID && (
                  <SummaryField label="Client name">{formData.clientName}</SummaryField>
                )}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Job details</h3>
              </div>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <SummaryField label="Job title">{selectedJobTitle?.job_title_id || jobTitleLabel || formData.jobTitle}</SummaryField>
                <SummaryField label="Job order details">{formData.jobOrderDetails}</SummaryField>
              </dl>
              {jobItems.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {jobItems.length} optional item row(s) were entered, but the current create API does not persist them.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Assignment</h3>
              </div>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <SummaryField label="Branch">{formData.branch}</SummaryField>
                <SummaryField label="Salesman">{selectedSalesman?.name}</SummaryField>
                <SummaryField label="Designer">{selectedDesigner?.name}</SummaryField>
                <SummaryField label="Assignee">{formData.assignee}</SummaryField>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">Schedule</h3>
              </div>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <SummaryField label="Due date">{formData.dueDate}</SummaryField>
                <SummaryField label="Estimated hours">{formData.estimatedHours}</SummaryField>
                <SummaryField label="Priority">{formData.priority}</SummaryField>
                <SummaryField label="Status">{formData.status}</SummaryField>
                <SummaryField label="Delivered at">{formData.deliveredAt}</SummaryField>
              </dl>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Job images can be added after the job is created.
          </p>
        </section>
      </main>

      <footer className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (currentStage > 1) moveToStage((currentStage - 1) as FormStage);
          }}
          disabled={currentStage === 1 || isCreating}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" aria-hidden />
          Previous
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating} className="w-full sm:w-auto">
              Cancel
            </Button>
          )}
          {currentStage < 5 ? (
            <Button
              type="button"
              onClick={() => moveToStage((currentStage + 1) as FormStage)}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              {currentStage === 4 ? "Review job" : "Continue"}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" disabled={isCreating || submissionGuard.current} className="w-full sm:w-auto">
              {isCreating ? (
                <>
                  <span className="me-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent" />
                  Creating…
                </>
              ) : (
                <>
                  <ClipboardCheck className="me-2 h-4 w-4" aria-hidden />
                  Create job
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}
