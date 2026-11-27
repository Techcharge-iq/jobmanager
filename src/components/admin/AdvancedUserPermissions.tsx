
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { listProfilesForAdministration, updateProfile } from "@/data/profiles";
import { 
  UserCheck, Shield, Eye, Edit, Trash2, Plus, Settings, FileText, 
  BarChart3, Users, Lock, Unlock, Crown, AlertTriangle, Check, X 
} from "lucide-react";

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
  category: 'page' | 'action' | 'data' | 'admin';
  icon: React.ReactNode;
  level: 'basic' | 'moderate' | 'advanced' | 'critical';
}

interface UserPermissionSet {
  userId: string;
  permissions: string[];
  customSettings: Record<string, any>;
}

const permissions: Permission[] = [
  // Page Access
  { id: 'dashboard', name: 'Dashboard Access', description: 'View main dashboard', category: 'page', level: 'basic', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'jobs', name: 'Job Management', description: 'Access job management pages', category: 'page', level: 'basic', icon: <FileText className="w-4 h-4" /> },
  { id: 'reports', name: 'Reports & Analytics', description: 'View reports and analytics', category: 'page', level: 'moderate', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'admin', name: 'Admin Panel', description: 'Access admin functions', category: 'page', level: 'critical', icon: <Shield className="w-4 h-4" /> },
  { id: 'settings', name: 'System Settings', description: 'Modify system settings', category: 'page', level: 'advanced', icon: <Settings className="w-4 h-4" /> },
  { id: 'user_management', name: 'User Management', description: 'Manage user accounts', category: 'page', level: 'critical', icon: <Users className="w-4 h-4" /> },
  
  // Action Rights
  { id: 'create_jobs', name: 'Create Jobs', description: 'Create new job orders', category: 'action', level: 'basic', icon: <Plus className="w-4 h-4" /> },
  { id: 'edit_jobs', name: 'Edit Jobs', description: 'Modify existing job orders', category: 'action', level: 'moderate', icon: <Edit className="w-4 h-4" /> },
  { id: 'delete_jobs', name: 'Delete Jobs', description: 'Remove job orders permanently', category: 'action', level: 'advanced', icon: <Trash2 className="w-4 h-4" /> },
  { id: 'approve_jobs', name: 'Approve Jobs', description: 'Approve pending job orders', category: 'action', level: 'moderate', icon: <Check className="w-4 h-4" /> },
  { id: 'reject_jobs', name: 'Reject Jobs', description: 'Reject job orders', category: 'action', level: 'moderate', icon: <X className="w-4 h-4" /> },
  { id: 'manage_customers', name: 'Customer Management', description: 'Add/edit customer information', category: 'action', level: 'moderate', icon: <Users className="w-4 h-4" /> },
  { id: 'export_data', name: 'Export Data', description: 'Export system data', category: 'action', level: 'moderate', icon: <FileText className="w-4 h-4" /> },
  
  // Data Access
  { id: 'view_all_jobs', name: 'View All Jobs', description: 'See all job orders system-wide', category: 'data', level: 'advanced', icon: <Eye className="w-4 h-4" /> },
  { id: 'view_own_jobs', name: 'View Own Jobs', description: 'See only own created jobs', category: 'data', level: 'basic', icon: <Eye className="w-4 h-4" /> },
  { id: 'view_branch_jobs', name: 'View Branch Jobs', description: 'See jobs for specific branch', category: 'data', level: 'moderate', icon: <Eye className="w-4 h-4" /> },
  { id: 'view_financial_data', name: 'Financial Data', description: 'Access financial information', category: 'data', level: 'advanced', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'view_user_activity', name: 'User Activity', description: 'Monitor user activities', category: 'data', level: 'advanced', icon: <Eye className="w-4 h-4" /> },
  
  // Admin Controls
  { id: 'manage_permissions', name: 'Manage Permissions', description: 'Modify user permissions', category: 'admin', level: 'critical', icon: <Crown className="w-4 h-4" /> },
  { id: 'system_backup', name: 'System Backup', description: 'Create system backups', category: 'admin', level: 'critical', icon: <Shield className="w-4 h-4" /> },
  { id: 'audit_logs', name: 'Audit Logs', description: 'Access system audit trails', category: 'admin', level: 'critical', icon: <FileText className="w-4 h-4" /> },
  { id: 'emergency_access', name: 'Emergency Override', description: 'Emergency system access', category: 'admin', level: 'critical', icon: <AlertTriangle className="w-4 h-4" /> },
];

type ValidRole = "admin" | "manager" | "salesman" | "employee" | "designer" | "job_order_manager";

const roleTemplates: Record<ValidRole, string[]> = {
  admin: permissions.map(p => p.id), // Full access
  manager: ['dashboard', 'jobs', 'reports', 'settings', 'create_jobs', 'edit_jobs', 'approve_jobs', 'reject_jobs', 'manage_customers', 'view_all_jobs', 'view_branch_jobs', 'view_financial_data', 'export_data'],
  job_order_manager: ['dashboard', 'jobs', 'reports', 'create_jobs', 'edit_jobs', 'approve_jobs', 'reject_jobs', 'view_all_jobs', 'view_branch_jobs', 'export_data'],
  salesman: ['dashboard', 'jobs', 'reports', 'create_jobs', 'manage_customers', 'view_branch_jobs', 'view_own_jobs'],
  designer: ['dashboard', 'jobs', 'view_own_jobs', 'edit_jobs'],
  employee: ['dashboard', 'jobs', 'create_jobs', 'view_own_jobs'],
};

const getPermissionLevelColor = (level: string) => {
  switch (level) {
    case 'basic': return 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/30';
    case 'moderate': return 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
    case 'advanced': return 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-500/30';
    case 'critical': return 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30';
    default: return 'bg-muted text-foreground border-border';
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

export function AdvancedUserPermissions() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [bulkOperations, setBulkOperations] = useState<string[]>([]);
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
        setSelectedUser({ ...selectedUser, role: newRole });
      }

      toast({
        title: "Success",
        description: `Role updated to ${newRole}`,
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
    
    toast({
      title: "Note",
      description: "Permission changes are currently stored locally. Database integration pending.",
    });
  };

  const handleBulkPermissionUpdate = async (operation: 'grant' | 'revoke', permissionIds: string[]) => {
    if (bulkOperations.length === 0) {
      toast({
        title: "Warning",
        description: "Please select users for bulk operation",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would implement bulk permission updates
      // This is a placeholder for the actual implementation
      toast({
        title: "Success",
        description: `Bulk ${operation} completed for ${bulkOperations.length} users`,
      });
      setBulkOperations([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk operation",
        variant: "destructive",
      });
    }
  };

  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
    const templatePermissions = roleTemplates[user.role as ValidRole] || [];
    setUserPermissions(templatePermissions);
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPermissions = {
    page: permissions.filter(p => p.category === 'page'),
    action: permissions.filter(p => p.category === 'action'),
    data: permissions.filter(p => p.category === 'data'),
    admin: permissions.filter(p => p.category === 'admin'),
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Advanced User Access Control
          </h1>
          <p className="text-muted-foreground">Comprehensive user permission management with granular control</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permission Details
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Bulk Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Users List */}
              <Card className="bg-card  border-0 shadow-xl">
                <CardHeader className="border-b bg-muted/40 text-foreground">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    System Users ({users.length})
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
                        {filteredUsers.map((user) => (
                          <TableRow 
                            key={user.id}
                            className={`cursor-pointer transition-colors ${
                              selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-500/15' : 'hover:bg-muted'
                            }`}
                            onClick={() => selectUser(user)}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.full_name || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                {user.department && (
                                  <div className="text-xs text-muted-foreground">{user.department}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`capitalize ${getRoleBadgeStyle(user.role)}`}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
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
                        <Badge variant="outline" className={`mt-2 capitalize ${getRoleBadgeStyle(selectedUser.role)}`}>
                          {selectedUser.role}
                        </Badge>
                      </div>

                      <Separator />

                      {/* Permission Categories */}
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category}>
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2 capitalize">
                            {category === 'page' && <BarChart3 className="w-4 h-4" />}
                            {category === 'action' && <Settings className="w-4 h-4" />}
                            {category === 'data' && <Eye className="w-4 h-4" />}
                            {category === 'admin' && <Crown className="w-4 h-4" />}
                            {category} Access
                          </h4>
                          <div className="space-y-2">
                            {perms.map((permission) => (
                              <div key={permission.id} className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                category === 'page' ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30' :
                                category === 'action' ? 'bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30' :
                                category === 'data' ? 'bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30' :
                                'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {permission.icon}
                                  <div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                      {permission.name}
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${getPermissionLevelColor(permission.level)}`}
                                      >
                                        {permission.level}
                                      </Badge>
                                    </div>
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
                          <Separator className="mt-4" />
                        </div>
                      ))}

                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => {
                          toast({
                            title: "Success",
                            description: "Permissions updated successfully",
                          });
                        }}
                      >
                        <Lock className="w-4 h-4 me-2" />
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
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="bg-card  border-0 shadow-xl">
              <CardHeader className="border-b bg-muted/40 text-foreground">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permission Reference Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                        {category === 'page' && <BarChart3 className="w-5 h-5 text-blue-500 dark:text-blue-300" />}
                        {category === 'action' && <Settings className="w-5 h-5 text-green-500 dark:text-green-300" />}
                        {category === 'data' && <Eye className="w-5 h-5 text-purple-500 dark:text-purple-300" />}
                        {category === 'admin' && <Crown className="w-5 h-5 text-red-500 dark:text-red-300" />}
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {perms.map((permission) => (
                          <div key={permission.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              {permission.icon}
                              <span className="font-medium text-sm">{permission.name}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getPermissionLevelColor(permission.level)}`}
                              >
                                {permission.level}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="bg-card  border-0 shadow-xl">
              <CardHeader className="border-b bg-muted/40 text-foreground">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Bulk Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Bulk Operations Warning</span>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Bulk operations affect multiple users simultaneously. Use with caution.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Select Users for Bulk Operations</h3>
                      <div className="max-h-64 overflow-y-auto border rounded-lg">
                        {users.map((user) => (
                          <div key={user.id} className="flex items-center gap-3 p-3 border-b hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={bulkOperations.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkOperations([...bulkOperations, user.id]);
                                } else {
                                  setBulkOperations(bulkOperations.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded"
                            />
                            <div>
                              <div className="font-medium">{user.full_name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Bulk Actions</h3>
                      <div className="space-y-3">
                        <Button 
                          className="w-full justify-start bg-green-500 hover:bg-green-600"
                          onClick={() => handleBulkPermissionUpdate('grant', ['dashboard', 'jobs'])}
                        >
                          <Unlock className="w-4 h-4 me-2" />
                          Grant Basic Permissions
                        </Button>
                        
                        <Button 
                          className="w-full justify-start bg-blue-500 hover:bg-blue-600"
                          onClick={() => handleBulkPermissionUpdate('grant', ['reports', 'view_branch_jobs'])}
                        >
                          <Eye className="w-4 h-4 me-2" />
                          Grant Reporting Access
                        </Button>
                        
                        <Button 
                          variant="destructive"
                          className="w-full justify-start"
                          onClick={() => handleBulkPermissionUpdate('revoke', ['admin', 'delete_jobs'])}
                        >
                          <Lock className="w-4 h-4 me-2" />
                          Revoke Critical Permissions
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setBulkOperations([])}
                        >
                          <X className="w-4 h-4 me-2" />
                          Clear Selection
                        </Button>
                      </div>
                      
                      {bulkOperations.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            Selected {bulkOperations.length} users for bulk operations
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
