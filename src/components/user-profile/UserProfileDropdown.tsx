
import { useState } from 'react';
import { LogOut, User, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  full_name: string;
  role: string;
}

interface UserProfileDropdownProps {
  userProfile: UserProfile | null;
}

export function UserProfileDropdown({ userProfile }: UserProfileDropdownProps) {
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30';
      case 'manager': return 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
      case 'designer': return 'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
      case 'salesman': return 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/30';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account menu"
          className="relative h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <User className="w-5 h-5" />
          {isOpen ? (
            <ChevronUp className="w-3 h-3 absolute -bottom-1 -end-1 bg-card rounded-full" />
          ) : (
            <ChevronDown className="w-3 h-3 absolute -bottom-1 -end-1 bg-card rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56 p-2">
        <div className="px-2 py-2">
          <p className="font-medium text-sm">{userProfile?.full_name || 'User'}</p>
          <Badge className={`text-xs mt-1 ${getRoleColor(userProfile?.role || 'employee')}`}>
            {userProfile?.role || 'Employee'}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 dark:text-red-300 hover:text-red-700 hover:bg-red-50 cursor-pointer"
        >
          <LogOut className="w-4 h-4 me-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
