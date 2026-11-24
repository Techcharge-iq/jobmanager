
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  UserPlus,
  FileText,
  Sparkles,
  Crown,
  MessageSquare
} from "lucide-react";
import { useCustomerManagement } from "@/hooks/useCustomerManagement";
import { useJobTitleManagement } from "@/hooks/useJobTitleManagement";
import { useUserManagement } from "@/hooks/useUserManagement";
import { CustomerManagement } from "@/components/admin/CustomerManagement";
import { JobTitleManagement } from "@/components/admin/JobTitleManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { AdvancedUserPermissions } from "@/components/admin/AdvancedUserPermissions";
import { CommunicationsManagement } from "@/components/CommunicationsManagement";

export function AdminManagement() {
  const customerHook = useCustomerManagement();
  const jobTitleHook = useJobTitleManagement();
  const userHook = useUserManagement();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              Admin Management
            </h1>
            <p className="text-muted-foreground text-lg">Manage customers, job titles, and users with powerful admin tools</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card  rounded-xl border-0 shadow-lg">
            <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-300" />
            <span className="text-sm font-medium text-foreground">Enhanced Admin Panel</span>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="bg-card  rounded-2xl border-0 shadow-xl overflow-hidden">
          <Tabs defaultValue="customers" className="w-full">
            <div className="bg-primary p-1">
              <TabsList className="grid w-full grid-cols-5 bg-white/20  rounded-xl border-0 p-1">
                <TabsTrigger 
                  value="customers" 
                  className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-lg text-white/90 font-medium transition-all duration-200"
                >
                  <Building2 className="w-4 h-4" />
                  Customers
                </TabsTrigger>
                <TabsTrigger 
                  value="job-titles" 
                  className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-lg text-white/90 font-medium transition-all duration-200"
                >
                  <FileText className="w-4 h-4" />
                  Job Titles
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-lg text-white/90 font-medium transition-all duration-200"
                >
                  <UserPlus className="w-4 h-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="permissions" 
                  className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-lg text-white/90 font-medium transition-all duration-200"
                >
                  <Crown className="w-4 h-4" />
                  Access Control
                </TabsTrigger>
                <TabsTrigger 
                  value="communications" 
                  className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-lg text-white/90 font-medium transition-all duration-200"
                >
                  <MessageSquare className="w-4 h-4" />
                  Communications
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8">
              <TabsContent value="customers" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Customer Management</h2>
                      <p className="text-muted-foreground">Add, edit, and manage customer information</p>
                    </div>
                  </div>
                  <CustomerManagement
                    customers={customerHook.customers}
                    customersLoading={customerHook.customersLoading}
                    customerForm={customerHook.customerForm}
                    setCustomerForm={customerHook.setCustomerForm}
                    onAddCustomer={customerHook.handleAddCustomer}
                    isAdding={customerHook.addCustomerMutation.isPending}
                  />
                </div>
              </TabsContent>

              <TabsContent value="job-titles" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Job Title Management</h2>
                      <p className="text-muted-foreground">Define and organize job titles for projects</p>
                    </div>
                  </div>
                  <JobTitleManagement
                    jobTitles={jobTitleHook.jobTitles}
                    jobTitlesLoading={jobTitleHook.jobTitlesLoading}
                    jobTitleForm={jobTitleHook.jobTitleForm}
                    setJobTitleForm={jobTitleHook.setJobTitleForm}
                    onAddJobTitle={jobTitleHook.handleAddJobTitle}
                    isAdding={jobTitleHook.addJobTitleMutation.isPending}
                  />
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                      <p className="text-muted-foreground">Create and manage user accounts and permissions</p>
                    </div>
                  </div>
                  <UserManagement
                    profiles={userHook.profiles}
                    profilesLoading={userHook.profilesLoading}
                    userForm={userHook.userForm}
                    setUserForm={userHook.setUserForm}
                    onAddUser={userHook.handleAddUser}
                    isAdding={userHook.addUserMutation.isPending}
                  />
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Advanced Access Control</h2>
                      <p className="text-muted-foreground">Granular permission management and user access control</p>
                    </div>
                  </div>
                  <AdvancedUserPermissions />
                </div>
              </TabsContent>

              <TabsContent value="communications" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Communications Management</h2>
                      <p className="text-muted-foreground">Manage email recipients, logs, and communication settings</p>
                    </div>
                  </div>
                  <CommunicationsManagement />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
