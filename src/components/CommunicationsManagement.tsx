import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, MessageSquare, Settings, Database, Send
} from "lucide-react";

export function CommunicationsManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('setup');
  
  const [whatsappConfig, setWhatsappConfig] = useState({
    api_key: '',
    phone_number: '',
    enabled: false
  });

  const handleWhatsAppConfigUpdate = async () => {
    toast({
      title: "Configuration Saved",
      description: "WhatsApp settings have been saved locally. Database integration will be available after migration.",
    });
  };


  return (
    <div className="space-y-6">
      <Alert className="mb-6">
        <Database className="h-4 w-4" />
        <AlertDescription>
          Communications management is being prepared. The database migration needs to be completed to enable full functionality.
          Currently showing configuration interface only.
        </AlertDescription>
      </Alert>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp Config
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-500/15 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Migration Required</h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                  To enable full communications management functionality, the following database tables need to be created:
                </p>
                <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1 mb-3">
                  <li>• email_recipients - For managing email distribution lists</li>
                  <li>• email_logs - For tracking sent emails and delivery status</li>
                  <li>• system_configurations - For storing WhatsApp and other settings</li>
                  <li>• user_permissions - For granular permission management</li>
                </ul>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  Once the migration is complete, you'll be able to manage email recipients, view email logs, and configure communication settings.
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Current Functionality</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  The send-notification edge function is already configured and ready to log emails once the database tables are created.
                  WhatsApp configuration can be set up in the next tab.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                WhatsApp Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Enable WhatsApp Integration</h3>
                  <p className="text-sm text-muted-foreground">Allow sending messages via WhatsApp</p>
                </div>
                <Switch
                  checked={whatsappConfig.enabled}
                  onCheckedChange={(checked) => setWhatsappConfig(prev => ({ ...prev, enabled: checked }))}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">API Key</label>
                  <Input
                    type="password"
                    placeholder="WhatsApp API Key"
                    value={whatsappConfig.api_key}
                    onChange={(e) => setWhatsappConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    placeholder="WhatsApp Phone Number"
                    value={whatsappConfig.phone_number}
                    onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button onClick={handleWhatsAppConfigUpdate}>
                <Send className="w-4 h-4 me-2" />
                Update Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Communication Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Email and communication settings will be available here after the database migration is completed.
                </p>
                
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Planned Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Email template management</li>
                    <li>• Notification preferences</li>
                    <li>• SMTP configuration</li>
                    <li>• Email scheduling settings</li>
                    <li>• Delivery tracking preferences</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}