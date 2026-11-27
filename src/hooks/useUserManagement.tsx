
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeEdgeFunction } from '@/data/functions';
import { useToast } from '@/hooks/use-toast';
import { listProfilesWithDetails } from '@/data/profiles';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  department: string | null;
  branch: string | null;
  phone: string | null;
  is_active?: boolean;
}

const allowedRoles = ["admin", "manager", "employee", "designer", "salesman", "job_order_manager"] as const;
type Role = typeof allowedRoles[number];

function isValidRole(role: string): role is Role {
  return allowedRoles.includes(role as Role);
}

export function useUserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '',
    department: '',
    branch: '',
    phone: ''
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      return listProfilesWithDetails() as Promise<Profile[]>;
    }
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      fullName: string;
      role: string;
      department: string;
      branch: string;
      phone: string;
    }) => {
      
      if (!isValidRole(userData.role)) {
        throw new Error(`Invalid role: ${userData.role}. Must be one of: ${allowedRoles.join(', ')}`);
      }

      const { data, error } = await invokeEdgeFunction<{ profile: Profile }>(
        'admin-create-user',
        {
          body: {
            email: userData.email,
            password: userData.password,
            fullName: userData.fullName,
            role: userData.role,
            department: userData.department || null,
            branch: userData.branch || null,
            phone: userData.phone || null,
          },
        },
      );
      if (error) {
        console.error('Error creating user:', error);
        let message = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch { /* keep generic message */ }
        throw new Error(message);
      }

      if (!data?.profile) {
        throw new Error('User was created without a profile response');
      }

      return data.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setUserForm({
        email: '',
        password: '',
        fullName: '',
        role: '',
        department: '',
        branch: '',
        phone: ''
      });
      toast({
        title: "Success",
        description: "User added successfully",
      });
    },
    onError: (error) => {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    }
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (userForm.password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (userForm.email.trim() && userForm.password.trim() && userForm.fullName.trim()) {
      addUserMutation.mutate(userForm);
    }
  };

  return {
    profiles,
    profilesLoading,
    userForm,
    setUserForm,
    addUserMutation,
    handleAddUser
  };
}
