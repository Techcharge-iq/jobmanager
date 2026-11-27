ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS invoiced_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_job_invoiced_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'invoiced' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'invoiced' OR NEW.invoiced_at IS NULL THEN
      NEW.invoiced_at := COALESCE(CASE WHEN TG_OP = 'UPDATE' AND OLD.status = 'invoiced' THEN OLD.invoiced_at END, now());
    END IF;
  ELSE
    NEW.invoiced_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_job_invoiced_at BEFORE INSERT OR UPDATE ON public.job_orders
FOR EACH ROW EXECUTE FUNCTION public.set_job_invoiced_at();

ALTER TABLE public.job_orders DISABLE TRIGGER trigger_prevent_invoiced_update;
ALTER TABLE public.job_orders DISABLE TRIGGER job_order_changes_trigger;
ALTER TABLE public.job_orders DISABLE TRIGGER trigger_job_edit_audit;

UPDATE public.job_orders j SET invoiced_at = COALESCE(
  (SELECT max(l.changed_at) FROM public.job_order_logs l
   WHERE l.job_order_id = j.id AND l.changed_fields->'status'->>'new' = 'invoiced'),
  j.updated_at)
WHERE j.status = 'invoiced';

ALTER TABLE public.job_orders ENABLE TRIGGER trigger_prevent_invoiced_update;
ALTER TABLE public.job_orders ENABLE TRIGGER job_order_changes_trigger;
ALTER TABLE public.job_orders ENABLE TRIGGER trigger_job_edit_audit;