ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id);

-- Institution members may view undertakings tied to applications they created.
DROP POLICY IF EXISTS undertakings_select ON public.undertakings;
CREATE POLICY undertakings_select ON public.undertakings FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR created_by = auth.uid()
  OR institution_id IS NULL
  OR EXISTS (SELECT 1 FROM public.institution_users iu WHERE iu.institution_id = undertakings.institution_id AND iu.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = undertakings.application_id AND a.created_by = auth.uid())
);

-- Officials may update applications (stage movement, approval columns).
-- Institution-side restrictions stay in the guard trigger.
DROP POLICY IF EXISTS applications_official_update ON public.applications;
CREATE POLICY applications_official_update ON public.applications FOR UPDATE TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));