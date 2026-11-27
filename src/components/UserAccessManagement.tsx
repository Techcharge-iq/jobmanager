
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { listProfilesForAdministration, updateProfile } from "@/data/profiles";
import { useAuth } from "@/hooks/useAuth";
import { UserCheck, Shield, Eye, Edit, Trash2, Plus, Settings, FileText, BarChart3 } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  department: string | null;
  branch: string | null;
  phone: string | null;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'page' | 'action' | 'data';
  icon: React.ReactNode;
}

const permissions: Permission[] = [
  // Page Access
  { id: 'dashboard', name: 'Dashboard', description: 'Access to main dashboard', category: 'page', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'jobs', name: 'Job Management', description: 'Access to job management pages', category: 'page', icon: <FileText className="w-4 h-4" /> },
  { id: 'reports', name: 'Reports', description: 'Access to reports and analytics', category: 'page', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'admin', name: 'Admin Panel', description: 'Access to admin functions', category: 'page', icon: <Shield className="w-4 h-4" /> },
  { id: 'settings', name: 'Settings', description: 'Access to system settings', category: 'page', icon: <Settings className="w-4 h-4" /> },
  
  // Action Rights
  { id: 'create_jobs', name: 'Create Jobs', description: 'Create new job orders', category: 'action', icon: <Plus className="w-4 h-4" /> },
  { id: 'edit_jobs', name: 'Edit Jobs', description: 'Modify existing job orders', category: 'action', icon: <Edit className="w-4 h-4" /> },
  { id: 'delete_jobs', name: 'Delete Jobs', description: 'Remove job orders', category: 'action', icon: <Trash2 className="w-4 h-4" /> },
  { id: 'manage_users', name: 'Manage Users', description: 'Add, edit, or remove users', category: 'action', icon: <UserCheck className="w-4 h-4" /> },
  
  // Data Access
  { id: 'view_all_jobs', name: 'View All Jobs', description: 'See all job orders system-wide', category: 'data', icon: <Eye className="w-4 h-4" /> },
  { id: 'view_own_jobs', name: 'View Own Jobs', description: 'See only own created jobs', category: 'data', icon: <Eye className="w-4 h-4" /> },
];

type ValidRole = "admin" | "manager" | "salesman" | "employee" | "designer" | "job_order_manager";

const roleTemplates: Record<ValidRole, string[]> = {
  admin: ['dashboard', 'jobs', 'reports', 'admin', 'settings', 'create_jobs', 'edit_jobs', 'delete_jobs', 'manage_users', 'view_all_jobs'],
  manager: ['dashboard', 'jobs', 'reports', 'settings', 'create_jobs', 'edit_jobs', 'view_all_jobs'],
  employee: ['dashboard', 'jobs', 'create_jobs', 'edit_jobs', 'view_own_jobs'],
  designer: ['dashboard', 'jobs', 'view_own_jobs'],
  salesman: ['dashboard', 'jobs', 'reports', 'create_jobs', 'view_all_jobs'],
  job_order_manager: ['dashboard', 'jobs', 'reports', 'create_jobs', 'edit_jobs', 'view_all_jobs'],
};

export default function UserAccessManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setUsers(await listProfilesForAdministration());
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateProfile(userId, { role: newRole as ValidRole });

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      if (selectedUser?.id === userId) {
        const templatePermissions = roleTemplates[newRole as ValidRole] || [];
        setUserPermissions(templatePermissions);
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }

      toast({
        title: "Success",
        description: `Role updated successfully`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setUserPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const selectUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    const templatePermissions = roleTemplates[userProfile.role as ValidRole] || [];
    setUserPermissions(templatePermissions);
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPermissions = {
    page: permissions.filter(p => p.category === 'page'),
    action: permissions.filter(p => p.category === 'action'),
    data: permissions.filter(p => p.category === 'data'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">User Access Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions across the system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <Card className="bg-card  border-0 shadow-xl">
            <CardHeader className="border-b bg-muted/40 text-foreground">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                System Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow 
                        key={u.id}
                        className={`cursor-pointer transition-colors ${
                          selectedUser?.id === u.id ? 'bg-blue-50 dark:bg-blue-500/15' : 'hover:bg-muted'
                        }`}
                        onClick={() => selectUser(u)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{u.full_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{u.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Panel */}
          <Card className="bg-card  border-0 shadow-xl">
            <CardHeader className="border-b bg-muted/40 text-foreground">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissions & Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {selectedUser ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedUser.full_name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <Badge variant="outline" className="mt-2 capitalize">
                      {selectedUser.role}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Page Access */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Page Access
                    </h4>
                    <div className="space-y-2">
                      {groupedPermissions.page.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-500/15 rounded-lg">
                          <div className="flex items-center gap-2">
                            {permission.icon}
                            <div>
                              <div className="font-medium text-sm">{permission.name}</div>
                              <div className="text-xs text-muted-foreground">{permission.description}</div>
                            </div>
                          </div>
                          <Switch
                            checked={userPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Action Rights */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Action Rights
                    </h4>
                    <div className="space-y-2">
                      {groupedPermissions.action.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-500/15 rounded-lg">
                          <div className="flex items-center gap-2">
                            {permission.icon}
                            <div>
                              <div className="font-medium text-sm">{permission.name}</div>
                              <div className="text-xs text-muted-foreground">{permission.description}</div>
                            </div>
                          </div>
                          <Switch
                            checked={userPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Data Access */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Data Access
                    </h4>
                    <div className="space-y-2">
                      {groupedPermissions.data.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-500/15 rounded-lg">
                          <div className="flex items-center gap-2">
                            {permission.icon}
                            <div>
                              <div className="font-medium text-sm">{permission.name}</div>
                              <div className="text-xs text-muted-foreground">{permission.description}</div>
                            </div>
                          </div>
                          <Switch
                            checked={userPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => {
                      toast({
                        title: "Success",
                        description: "Permissions updated successfully",
                      });
                    }}
                  >
                    Save Permissions
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a user to manage their permissions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
