import { useState, type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, User, Mail, Phone, Building, Shield, UserX, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/data/functions";
import { useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/hooks/useUserManagement";

interface UserManagementProps {
  profiles: Profile[];
  profilesLoading: boolean;
  userForm: UserForm;
  setUserForm: Dispatch<SetStateAction<UserForm>>;
  onAddUser: (e: React.FormEvent) => void;
  isAdding: boolean;
}

interface UserForm {
  email: string;
  password: string;
  fullName: string;
  role: string;
  department: string;
  branch: string;
  phone: string;
}

export function UserManagement({
  profiles,
  profilesLoading,
  userForm,
  setUserForm,
  onAddUser,
  isAdding
}: UserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setTogglingStatus(userId);
    
    try {
      const { error } = await invokeEdgeFunction('toggle-user-status', {
        body: {
          userId: userId,
          isActive: !currentStatus
        }
      });

      if (error) throw error;

      toast({
        title: !currentStatus ? "User Activated" : "User Deactivated",
        description: `User has been successfully ${!currentStatus ? 'activated' : 'deactivated'}`
      });

      // Refresh profiles
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive"
      });
    } finally {
      setTogglingStatus(null);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30";
      case "manager": return "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30";
      case "designer": return "bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/30";
      case "salesman": return "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/30";
      case "job_order_manager": return "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-500/30";
      default: return "bg-muted text-foreground border-border";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add New User Form */}
      <Card className="bg-card  border-0 shadow-xl">
        <CardHeader className="bg-primary text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            Add New User
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={onAddUser} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail" className="flex items-center gap-2 font-medium">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userPassword" className="flex items-center gap-2 font-medium">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Password
                </Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userFullName" className="flex items-center gap-2 font-medium">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="userFullName"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                  className="bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userRole" className="font-medium">User Role</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="bg-card border-border focus:border-indigo-500">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="salesman">Salesman</SelectItem>
                    <SelectItem value="job_order_manager">Job Order Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userDepartment" className="flex items-center gap-2 font-medium">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    Department
                  </Label>
                  <Input
                    id="userDepartment"
                    value={userForm.department}
                    onChange={(e) => setUserForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Enter department"
                    className="bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userBranch" className="font-medium">Branch</Label>
                  <Input
                    id="userBranch"
                    value={userForm.branch}
                    onChange={(e) => setUserForm(prev => ({ ...prev, branch: e.target.value }))}
                    placeholder="Enter branch"
                    className="bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userPhone" className="flex items-center gap-2 font-medium">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="userPhone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 shadow-lg"
              disabled={isAdding}
            >
              {isAdding ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating User...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create User Account
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Users Table */}
      <Card className="bg-card  border-0 shadow-xl">
        <CardHeader className="bg-primary text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            Existing Users ({profiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {profilesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80">
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-foreground">Department</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id} className="hover:bg-white/50 transition-colors">
                      <TableCell className="font-medium flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {profile.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        {profile.full_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {profile.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getRoleBadgeStyle(profile.role)} border-2 font-medium`}
                        >
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          {profile.department || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={profile.is_active !== false}
                            onCheckedChange={() => handleToggleUserStatus(profile.id, profile.is_active !== false)}
                            disabled={togglingStatus === profile.id}
                          />
                          <Badge 
                            variant="outline"
                            className={profile.is_active !== false 
                              ? "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/30" 
                              : "bg-muted text-foreground border-border"}
                          >
                            {profile.is_active !== false ? (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
