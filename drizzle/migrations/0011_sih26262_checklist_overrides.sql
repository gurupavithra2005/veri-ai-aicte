ALTER TABLE public.applications ADD COLUMN checklist_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.applications.checklist_overrides IS 'Authorized checklist item overrides, e.g. {"structural_stability":{"status":"not_applicable","reason":"..."}}';

ALTER TABLE public.documents ADD COLUMN review_remarks text;
COMMENT ON COLUMN public.documents.review_remarks IS 'Authorized reviewer remarks for the checklist document status';