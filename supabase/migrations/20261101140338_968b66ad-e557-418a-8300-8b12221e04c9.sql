CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- The profile trigger owns role synchronization; do not insert the same role twice.
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'employee'::public.app_role
  );
  RETURN NEW;
END;
$function$;

-- Exercise the real signup triggers without retaining a test account.
DO $test$
DECLARE
  test_user_id uuid := gen_random_uuid();
  role_count integer;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (test_user_id, 'signup-regression-' || test_user_id::text || '@example.invalid', '{"full_name":"Signup regression"}'::jsonb);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id AND role = 'employee'::public.app_role) THEN
      RAISE EXCEPTION 'Signup regression: employee profile missing';
    END IF;
    SELECT count(*) INTO role_count FROM public.user_roles WHERE user_id = test_user_id;
    IF role_count <> 1 OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = test_user_id AND role = 'employee'::public.app_role) THEN
      RAISE EXCEPTION 'Signup regression: expected exactly one employee role, got %', role_count;
    END IF;
    UPDATE public.profiles SET role = 'designer'::public.app_role WHERE id = test_user_id;
    SELECT count(*) INTO role_count FROM public.user_roles WHERE user_id = test_user_id;
    IF role_count <> 1 OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = test_user_id AND role = 'designer'::public.app_role) THEN
      RAISE EXCEPTION 'Signup regression: selected designer role did not synchronize';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'Rollback successful regression test';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    NULL;
  END;
END;
$test$;