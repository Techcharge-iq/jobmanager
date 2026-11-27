import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AsyncSelect from 'react-select/async';
import { searchJobTitles, createJobTitle, JobTitle as JobTitleType } from "@/services/jobTitles";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { JobTitle } from "@/hooks/useDropdownData";

interface JobDetailsSectionProps {
  jobTitle: string;
  assignee: string;
  onJobTitleChange: (value: string) => void;
  onJobTitleNameChange?: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  jobTitles: JobTitle[];
  hideAssignee?: boolean;
}

export function JobDetailsSection({ 
  jobTitle, 
  assignee, 
  onJobTitleChange, 
  onJobTitleNameChange,
  onAssigneeChange, 
  jobTitles,
  hideAssignee = false,
}: JobDetailsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);

  useEffect(() => {
    const title = jobTitles.find(t => t.id === jobTitle);
    if (title) {
      setSelectedOption({ value: title.id, label: title.job_title_id });
    }
  }, [jobTitle, jobTitles]);

  const loadOptions = (inputValue: string, callback: (options: any[]) => void) => {
    if (inputValue.length < 2) {
      callback([]);
      return;
    }
    
    setTimeout(async () => {
      try {
        const results = await searchJobTitles(inputValue);
        callback(results.map(t => ({ value: t.id, label: t.job_title_id })));
      } catch (error) {
        callback([]);
      }
    }, 300);
  };

  const handleCreate = async (title: string): Promise<{ id: string; name: string }> => {
    const newTitle = await createJobTitle(title);
    onJobTitleChange(newTitle.id);
    onJobTitleNameChange?.(newTitle.job_title_id);
    setSelectedOption({ value: newTitle.id, label: newTitle.job_title_id });
    return { id: newTitle.id, name: newTitle.job_title_id };
  };

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: 'hsl(var(--input))',
      backgroundColor: 'hsl(var(--background))',
      borderRadius: '0.375rem',
      minHeight: '2.5rem',
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      zIndex: 50,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
      color: 'hsl(var(--foreground))',
    }),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="jobTitle">Job Title *</Label>
        <div className="flex gap-2">
          <AsyncSelect
            className="flex-1"
            inputId="jobTitle"
            styles={customStyles}
            value={selectedOption}
            loadOptions={loadOptions}
            onChange={(option) => {
              onJobTitleChange(option?.value || '');
              onJobTitleNameChange?.(option?.label || '');
              setSelectedOption(option);
            }}
            placeholder="Type to search job title..."
            isClearable
          />
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QuickCreateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create Job Title"
        label="Job Title"
        placeholder="Enter job title"
        onSave={handleCreate}
      />

      {!hideAssignee && (
        <div>
          <Label htmlFor="assignee">Assignee</Label>
          <Input
            id="assignee"
            type="text"
            placeholder="Assignee"
            value={assignee}
            onChange={(e) => onAssigneeChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
