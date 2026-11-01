import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = [
  "admin",
  "manager",
  "employee",
  "designer",
  "salesman",
  "job_order_manager",
] as const;

type UserRole = (typeof allowedRoles)[number];

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department: string | null;
  branch: string | null;
  phone: string | null;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase service configuration");
    return jsonResponse({ error: "User creation is unavailable" }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const token = authorization.slice("Bearer ".length);
  const { data: { user: requester }, error: authError } =
    await supabaseAdmin.auth.getUser(token);

  if (authError || !requester) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const { data: requesterProfile, error: roleError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_active")
    .eq("id", requester.id)
    .maybeSingle();
  if (roleError) {
    console.error("Failed to verify user creation permission:", roleError);
    return jsonResponse({ error: "Unable to verify permissions" }, 500);
  }
  if (
    !requesterProfile?.is_active ||
    (requesterProfile.role !== "admin" && requesterProfile.role !== "manager")
  ) {
    return jsonResponse({ error: "Administrative access is required" }, 403);
  }

  let userData: CreateUserRequest;
  try {
    userData = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  if (
    !userData ||
    typeof userData.email !== "string" ||
    !userData.email.trim() ||
    typeof userData.password !== "string" ||
    userData.password.length < 8 ||
    typeof userData.fullName !== "string" ||
    !userData.fullName.trim() ||
    !allowedRoles.includes(userData.role)
  ) {
    return jsonResponse({ error: "Please provide valid user details" }, 400);
  }
  if (
    requesterProfile.role === "manager" &&
    (userData.role === "admin" ||
      userData.role === "manager" ||
      userData.role === "job_order_manager")
  ) {
    return jsonResponse({ error: "Managers cannot assign administrative roles" }, 403);
  }

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: userData.email.trim(),
      password: userData.password,
      // Admin-created accounts are pre-confirmed: the admin sets the password,
      // so no confirmation email is needed (and SMTP failures can't block creation).
      email_confirm: true,
      user_metadata: { full_name: userData.fullName.trim() },
    });
  if (createError || !created.user) {
    console.error("Failed to create auth user:", createError);
    return jsonResponse({ error: "Unable to create user" }, 400);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: created.user.id,
      email: userData.email.trim(),
      full_name: userData.fullName.trim(),
      role: userData.role,
      department: userData.department || null,
      branch: userData.branch || null,
      phone: userData.phone || null,
      is_active: true,
    })
    .select("id, full_name, email, role, department, branch, phone, is_active")
    .single();

  if (profileError) {
    console.error("Failed to create user profile:", profileError);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      created.user.id,
    );
    if (deleteError) {
      console.error("Failed to remove auth user after profile creation failed:", deleteError);
    }
    return jsonResponse({ error: "Unable to finish creating user" }, 500);
  }


  return jsonResponse({ profile }, 201);
});
