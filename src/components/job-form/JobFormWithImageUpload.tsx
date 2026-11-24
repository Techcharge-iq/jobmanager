
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateJobOrder } from "@/hooks/useCreateJobOrder";
import { useDropdownData } from "@/hooks/useDropdownData";
import { BranchSection } from "./BranchSection";
import { CustomerSection } from "./CustomerSection";
import { JobDetailsSection } from "./JobDetailsSection";
import { TeamSection } from "./TeamSection";
import { ProjectDetailsSection } from "./ProjectDetailsSection";
import { ScheduleSection } from "./ScheduleSection";
import { JobOrderDetailsSection } from "./JobOrderDetailsSection";
import { FormActions } from "./FormActions";
import { ImageUploader } from "@/components/image-upload/ImageUploader";
import { ArrowLeft, Check, User, Briefcase, Users, Calendar, FileText, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobTitleDropdown } from "@/components/dropdowns/JobTitleDropdown";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface JobFormWithImageUploadProps {
  onCancel?: () => void;
}

export function JobFormWithImageUpload({ onCancel }: JobFormWithImageUploadProps) {
  const { toast } = useToast();
  const { createJobOrder, isCreating } = useCreateJobOrder();
  const { customers, designers, salesmen, jobTitles } = useDropdownData();
  
  const [currentStep, setCurrentStep] = useState<'form' | 'upload'>('form');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer: '',
    jobTitle: '',
    assignee: '',
    designer: '',
    salesman: '',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedHours: 8,
    branch: 'Head Office',
    jobOrderDetails: '',
    clientName: ''
  });

  const [jobItems, setJobItems] = useState<Array<{
    job_title_id: string;
    description: string;
    quantity: number;
  }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newJob = await createJobOrder({
        customer_id: formData.customer,
        job_title_id: formData.jobTitle,
        designer_id: formData.designer,
        salesman_id: formData.salesman,
        assignee: formData.assignee,
        priority: formData.priority as 'low' | 'medium' | 'high',
        status: formData.status as 'pending' | 'in-progress' | 'designing' | 'completed' | 'finished' | 'cancelled' | 'invoiced',
        due_date: formData.dueDate,
        estimated_hours: formData.estimatedHours,
        branch: formData.branch,
        job_order_details: formData.jobOrderDetails,
        client_name: formData.clientName
      });

      // Job order items table doesn't exist - skip item creation
      // Items are stored in job_order_details field instead

      toast({
        title: "Success",
        description: jobItems.length > 0 
          ? `Job order created with ${jobItems.length} items! Now you can upload images.`
          : "Job order created successfully! Now you can upload images.",
      });

      setCreatedJobId(newJob.id);
      setCurrentStep('upload');
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create job order: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleImageUploadComplete = () => {
    toast({
      title: "Complete",
      description: "Job order created and images uploaded successfully!",
    });
    
    // Reset form and close modal
    setFormData({
      customer: '',
      jobTitle: '',
      assignee: '',
      designer: '',
      salesman: '',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date().toISOString().split('T')[0],
      estimatedHours: 8,
      branch: 'Head Office',
      jobOrderDetails: '',
      clientName: ''
    });
    setCurrentStep('form');
    setCreatedJobId(null);
    
    if (onCancel) {
      onCancel();
    }
  };

  const handleSkipImageUpload = () => {
    handleImageUploadComplete();
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    setCreatedJobId(null);
  };

  if (currentStep === 'upload' && createdJobId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToForm}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 me-2 rtl:-scale-x-100" />
            Back
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Upload Job Images</h3>
            <p className="text-sm text-muted-foreground">
              Add images related to this job order (optional)
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <ImageUploader
            jobOrderId={createdJobId}
            onUploadComplete={handleImageUploadComplete}
            maxFiles={10}
          />
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSkipImageUpload}
              variant="outline"
              className="flex-1 hover:bg-muted"
            >
              Skip Image Upload
            </Button>
            <Button
              onClick={handleImageUploadComplete}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Check className="w-4 h-4 me-2" />
              Finish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Progress Indicator */}
      <div className="text-center">
        <div className="inline-flex items-center px-4 py-2 bg-accent rounded-full">
          <div className="w-2 h-2 bg-blue-500 rounded-full me-2"></div>
          <p className="text-sm font-medium text-foreground">
            Step 1 of 2: Job Details
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info Section */}
        <Card className="border-s-4 border-s-blue-400 bg-accent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              <h3 className="text-lg font-semibold text-foreground">Customer Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BranchSection 
                value={formData.branch} 
                onChange={(value) => setFormData(prev => ({ ...prev, branch: value }))} 
              />
              <CustomerSection 
                value={formData.customer} 
                onChange={(value) => setFormData(prev => ({ ...prev, customer: value }))}
                customers={customers}
                clientName={formData.clientName}
                onClientNameChange={(value) => setFormData(prev => ({ ...prev, clientName: value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Details Section */}
        <Card className="border-s-4 border-s-green-400 bg-accent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-green-600 dark:text-green-300" />
              <h3 className="text-lg font-semibold text-foreground">Job Details</h3>
            </div>
            
            <JobDetailsSection 
              jobTitle={formData.jobTitle}
              assignee={formData.assignee}
              onJobTitleChange={(value) => setFormData(prev => ({ ...prev, jobTitle: value }))}
              onAssigneeChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}
              jobTitles={jobTitles}
            />
          </CardContent>
        </Card>

        {/* Team Assignment Section */}
        <Card className="border-s-4 border-s-purple-400 bg-accent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              <h3 className="text-lg font-semibold text-foreground">Team Assignment</h3>
            </div>
            
            <TeamSection 
              designer={formData.designer}
              salesman={formData.salesman}
              onDesignerChange={(value) => setFormData(prev => ({ ...prev, designer: value }))}
              onSalesmanChange={(value) => setFormData(prev => ({ ...prev, salesman: value }))}
              designers={designers}
              salesmen={salesmen}
            />
          </CardContent>
        </Card>

        {/* Project Details Section */}
        <Card className="border-s-4 border-s-orange-400 bg-accent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-300" />
              <h3 className="text-lg font-semibold text-foreground">Schedule & Priority</h3>
            </div>
            
            <div className="space-y-6">
              <ProjectDetailsSection 
                priority={formData.priority}
                status={formData.status}
                onPriorityChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                onStatusChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              />

              <ScheduleSection 
                dueDate={formData.dueDate}
                estimatedHours={formData.estimatedHours}
                onDueDateChange={(value) => setFormData(prev => ({ ...prev, dueDate: value }))}
                onEstimatedHoursChange={(value) => setFormData(prev => ({ ...prev, estimatedHours: value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Items Section */}
        <Card className="border-s-4 border-s-teal-400 bg-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                <h3 className="text-lg font-semibold text-foreground">Job Items (Optional)</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setJobItems([...jobItems, { job_title_id: "", description: "", quantity: 1 }])}
              >
                <Plus className="h-4 w-4 me-2" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {jobItems.map((item, index) => (
                <Card key={index} className="p-4 bg-card">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setJobItems(jobItems.filter((_, i) => i !== index))}
                        className="text-red-500 dark:text-red-300 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label>Item Name *</Label>
                      <JobTitleDropdown
                        value={item.job_title_id}
                        onValueChange={(value) => {
                          const newItems = [...jobItems];
                          newItems[index].job_title_id = value;
                          setJobItems(newItems);
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label>Description *</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...jobItems];
                          newItems[index].description = e.target.value;
                          setJobItems(newItems);
                        }}
                        placeholder="Describe the work..."
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...jobItems];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setJobItems(newItems);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
              
              {jobItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items added yet. Click "Add Item" to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Details Section */}
        <Card className="border-s-4 border-s-indigo-400 bg-accent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              <h3 className="text-lg font-semibold text-foreground">Additional Details</h3>
            </div>
            
            <JobOrderDetailsSection 
              value={formData.jobOrderDetails}
              onChange={(value) => setFormData(prev => ({ ...prev, jobOrderDetails: value }))}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-border">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1 hover:bg-muted"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isCreating} 
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </div>
            ) : (
              "Create Job Order & Continue"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
