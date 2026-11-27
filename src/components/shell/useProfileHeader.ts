import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getProfileHeader } from "@/data/profiles";

export function useProfileHeader() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const fallback = { full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User", role: "employee" };
    getProfileHeader(user.id).then((d) => setProfile(d || fallback)).catch(() => setProfile(fallback));
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);
  return profile;
}
