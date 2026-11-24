import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/data/functions";
import { useUsers } from "@/hooks/useUsers";
import { Shield, RefreshCw } from "lucide-react";

export function AdminPasswordReset() {
  const { toast } = useToast();
  const { users, isLoading } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId || !newPassword) {
      toast({
        title: "Missing Information",
        description: "Please select a user and enter a new password",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await invokeEdgeFunction('admin-reset-password', {
        body: {
          userId: selectedUserId,
          newPassword: newPassword
        }
      });

      if (error) throw error;

      toast({
        title: "Password Reset",
        description: "User password has been successfully reset"
      });

      setSelectedUserId("");
      setNewPassword("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card  border-0 shadow-xl">
      <CardHeader className="bg-primary text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          Admin Password Reset
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="selectUser">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              className="bg-card border-border"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Resetting Password...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Reset User Password
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
