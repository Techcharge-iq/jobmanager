
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createJobTitle, listJobTitles } from "@/data/jobTitles";

interface JobTitle {
  id: string;
  job_title_id: string;
}

interface JobTitleDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function JobTitleDropdown({ value, onValueChange, placeholder = "Select job title", id }: JobTitleDropdownProps) {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchJobTitles = async () => {
    try {
      setJobTitles(await listJobTitles());
    } catch (error) {
      console.error('Error fetching job titles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job titles",
        variant: "destructive",
      });
    }
  };

  const handleCreateTitle = async () => {
    if (!newTitle.trim() || !user) return;

    setIsLoading(true);
    try {
      await createJobTitle(newTitle.trim());

      toast({
        title: "Success",
        description: "Job title created successfully",
      });

      setNewTitle("");
      setIsDialogOpen(false);
      fetchJobTitles();
    } catch (error) {
      console.error('Error creating job title:', error);
      toast({
        title: "Error",
        description: "Failed to create job title",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobTitles();
  }, []);

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {jobTitles.map((title) => (
            <SelectItem key={title.id} value={title.job_title_id}>
              {title.job_title_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Job Title</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter job title"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTitle} disabled={isLoading || !newTitle.trim()}>
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
