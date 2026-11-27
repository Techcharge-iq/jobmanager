
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  User, 
  Shield, 
  Palette, 
  Database,
  Download,
  Upload,
  Trash2,
  Save,
  Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useDirection } from "@/lib/directionContext";
import { useAuth } from "@/hooks/useAuth";
import { getProfileRole, getProfileSettings, updateProfile } from "@/data/profiles";
import { ChangePasswordDialog } from "@/components/user-profile/ChangePasswordDialog";
import { AdminPasswordReset } from "@/components/admin/AdminPasswordReset";
import { DataManagement } from "@/components/settings/DataManagement";
import { PageHeader } from "@/components/shell/PageHeader";

export function SettingsView() {
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { dir, setDir } = useDirection();
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    branch: '',
    department: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      setIsAdmin((await getProfileRole(user.id)) === 'admin');
    } catch (error) {
      console.error('Error checking profile role:', error);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const data = await getProfileSettings(user.id);

      if (data) {
        setProfileData({
          fullName: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          branch: data.branch || '',
          department: data.department || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await updateProfile(user.id, {
          full_name: profileData.fullName,
          phone: profileData.phone,
          branch: profileData.branch,
          department: profileData.department,
          updated_at: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Settings" description="Manage your application preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                value={profileData.fullName}
                onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                placeholder="Enter your full name" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={profileData.email}
                disabled
                placeholder="Email cannot be changed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                placeholder="Enter your phone number" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input 
                id="branch" 
                value={profileData.branch}
                onChange={(e) => setProfileData({...profileData, branch: e.target.value})}
                placeholder="Enter your branch" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input 
                id="department" 
                value={profileData.department}
                onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                placeholder="Enter your department" 
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleProfileUpdate}
              disabled={isLoading}
            >
              <Save className="w-4 h-4 me-2" />
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about job updates
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email summaries of daily activities
                </p>
              </div>
              <Switch
                checked={emailUpdates}
                onCheckedChange={setEmailUpdates}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch to dark theme
                </p>
              </div>
              <Switch
                aria-label="Dark mode"
                checked={resolvedTheme === "dark"}
                onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Right-to-left layout</Label>
                <p className="text-sm text-muted-foreground">
                  Mirror the layout for Arabic. Saved on this device only.
                </p>
              </div>
              <Switch
                aria-label="Right-to-left layout"
                checked={dir === "rtl"}
                onCheckedChange={(on) => setDir(on ? "rtl" : "ltr")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataManagement />
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline"
                onClick={() => setPasswordDialogOpen(true)}
              >
                <Lock className="w-4 h-4 me-2" />
                Change Password
              </Button>
              <Button variant="outline" disabled>Two-Factor Authentication (Coming Soon)</Button>
              <Button variant="outline" disabled>Login History (Coming Soon)</Button>
              <Button variant="outline" disabled>Privacy Settings (Coming Soon)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tools */}
        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-300" />
                Admin Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminPasswordReset />
            </CardContent>
          </Card>
        )}
      </div>

      <ChangePasswordDialog 
        open={passwordDialogOpen} 
        onOpenChange={setPasswordDialogOpen} 
      />
    </div>
  );
}
