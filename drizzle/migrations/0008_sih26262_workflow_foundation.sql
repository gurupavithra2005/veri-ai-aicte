-- SIH26262 transformation: additive schema. Every statement is idempotent.

-- ===== Official helper (admin, reviewer, regional, EVC coordinator, competent authority) =====
CREATE OR REPLACE FUNCTION public.is_official(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','reviewer','regional_officer','evc_coordinator','competent_authority')
  )
$$;

-- Widen legacy staff check to all official roles.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','reviewer','regional_officer','evc_coordinator','competent_authority')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_official(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_official(uuid) TO anon;

-- ===== Institutions registry =====
CREATE TABLE IF NOT EXISTS public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aicte_permanent_id text,
  institution_name text NOT NULL,
  institution_type text,
  address text,
  state text,
  district text,
  region text,
  official_email text,
  contact_number text,
  account_status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS institutions_aicte_pid_unique
  ON public.institutions (aicte_permanent_id) WHERE aicte_permanent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.institution_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_at_institution text NOT NULL DEFAULT 'institution_user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);

-- ===== Org config =====
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bureaus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Workflow configuration =====
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  application_type text,
  institution_category text,
  aph_version text,
  effective_from date,
  active boolean NOT NULL DEFAULT true,
  config_status text NOT NULL DEFAULT 'prototype_demo',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  stage_order integer NOT NULL,
  stage_code text NOT NULL,
  stage_name text NOT NULL,
  responsible_role text NOT NULL,
  responsible_bureau text,
  timeline_days integer,
  allow_return boolean NOT NULL DEFAULT true,
  entry_conditions text,
  completion_conditions text,
  UNIQUE (template_id, stage_order)
);

-- ===== AICTE columns on applications (legacy columns untouched) =====
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS aicte_permanent_id text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS application_type text,
  ADD COLUMN IF NOT EXISTS processing_route text,
  ADD COLUMN IF NOT EXISTS processing_year text,
  ADD COLUMN IF NOT EXISTS aph_version text,
  ADD COLUMN IF NOT EXISTS current_stage text,
  ADD COLUMN IF NOT EXISTS assigned_bureau text,
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS workflow_template_id uuid REFERENCES public.workflow_templates(id),
  ADD COLUMN IF NOT EXISTS approval_state text;

COMMENT ON COLUMN public.applications.status IS 'Legacy SIH26261 verification status — do not mix with approval workflow';
COMMENT ON COLUMN public.applications.approval_state IS 'SIH26262 approval workflow state: in_progress|returned|with_committee|approved|rejected|withdrawn';
COMMENT ON COLUMN public.applications.current_stage IS 'SIH26262 current workflow stage_code';

-- ===== Stage history & observations =====
CREATE TABLE IF NOT EXISTS public.application_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  stage_order integer NOT NULL,
  stage_code text NOT NULL,
  stage_name text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  exited_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  assigned_to uuid REFERENCES public.profiles(id),
  completed_by uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  action_remarks text
);
CREATE UNIQUE INDEX IF NOT EXISTS stage_history_one_active_per_stage
  ON public.application_stage_history (application_id, stage_code) WHERE exited_at IS NULL;

CREATE TABLE IF NOT EXISTS public.stage_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  stage_history_id uuid REFERENCES public.application_stage_history(id) ON DELETE SET NULL,
  officer_id uuid REFERENCES public.profiles(id),
  observation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clarification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id),
  reason text NOT NULL,
  required_correction text,
  status text NOT NULL DEFAULT 'open',
  response_note text,
  responded_at timestamptz,
  responded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== EVC =====
CREATE TABLE IF NOT EXISTS public.evc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  requirement text,
  status text NOT NULL DEFAULT 'pending_scheduling',
  due_date date,
  scheduled_date date,
  visit_date date,
  completed_date date,
  committee_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  coordinator_id uuid REFERENCES public.profiles(id),
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Undertakings =====
CREATE TABLE IF NOT EXISTS public.undertakings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  prescribed_condition text,
  rule_reference text,
  issued_date date,
  due_date date,
  required_evidence text,
  status text NOT NULL DEFAULT 'upcoming',
  assigned_officer_id uuid REFERENCES public.profiles(id),
  verification_status text,
  verification_remarks text,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  compliance_closed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.undertaking_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  undertaking_id uuid NOT NULL REFERENCES public.undertakings(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  evidence_storage_path text,
  evidence_file_name text,
  note text,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Compliance documents / validity =====
CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id),
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  parent_document_id uuid REFERENCES public.compliance_documents(id),
  document_type text NOT NULL,
  document_number text,
  issue_date date,
  expiry_date date,
  validity_status text NOT NULL DEFAULT 'valid',
  file_name text,
  storage_path text,
  mime_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES public.profiles(id),
  renewal_required boolean NOT NULL DEFAULT false,
  renewal_submitted_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  verification_remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compliance_docs_expiry_idx
  ON public.compliance_documents (expiry_date) WHERE expiry_date IS NOT NULL;

-- ===== Regulatory rules & SLA =====
CREATE TABLE IF NOT EXISTS public.regulatory_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  source_document text,
  source_section text,
  aph_version text,
  effective_from date,
  effective_until date,
  applicable_institution_type text,
  applicable_application_type text,
  required_stage text,
  timeline_days integer,
  required_documents text[] NOT NULL DEFAULT '{}'::text[],
  validation_requirement text,
  config_status text NOT NULL DEFAULT 'pending_source',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sla_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  scope_value text,
  timeline_days integer,
  alert_before_days integer[] NOT NULL DEFAULT '{90,60,30,15,7}'::integer[],
  escalation_levels integer[] NOT NULL DEFAULT '{0,1,2,3}'::integer[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escalation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  undertaking_id uuid REFERENCES public.undertakings(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  notes text
);

-- ===== Document requirements: AICTE applicability columns =====
ALTER TABLE public.document_requirements
  ADD COLUMN IF NOT EXISTS applicable_institution_type text,
  ADD COLUMN IF NOT EXISTS applicable_application_type text,
  ADD COLUMN IF NOT EXISTS aph_version text,
  ADD COLUMN IF NOT EXISTS issue_date_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_date_required boolean NOT NULL DEFAULT false;

-- ===== updated_at triggers =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['workflow_templates','evc_records','undertakings','compliance_documents','regulatory_rules','sla_configurations']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_set_updated_at', t);
  END LOOP;
END $$;

-- Auto-register the creator as the first institution user.
CREATE OR REPLACE FUNCTION public.register_institution_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.institution_users (institution_id, user_id, role_at_institution)
    VALUES (NEW.id, auth.uid(), 'owner')
    ON CONFLICT (institution_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS institutions_register_creator ON public.institutions;
CREATE TRIGGER institutions_register_creator
AFTER INSERT ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.register_institution_creator();

-- ===== GRANTs =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions, public.institution_users,
  public.application_stage_history, public.stage_observations, public.clarification_requests,
  public.evc_records, public.undertakings, public.undertaking_submissions,
  public.compliance_documents, public.escalation_records
  TO authenticated;
GRANT ALL ON public.institutions, public.institution_users, public.application_stage_history,
  public.stage_observations, public.clarification_requests, public.evc_records, public.undertakings,
  public.undertaking_submissions, public.compliance_documents, public.escalation_records
  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions, public.bureaus, public.application_types,
  public.workflow_templates, public.workflow_stages, public.regulatory_rules, public.sla_configurations
  TO authenticated;
GRANT ALL ON public.regions, public.bureaus, public.application_types, public.workflow_templates,
  public.workflow_stages, public.regulatory_rules, public.sla_configurations TO service_role;

-- ===== RLS =====
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureaus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undertakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undertaking_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_records ENABLE ROW LEVEL SECURITY;

-- Institutions: members see their institutions; officials see all; create open to authenticated.
DROP POLICY IF EXISTS institutions_select ON public.institutions;
CREATE POLICY institutions_select ON public.institutions FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.institution_users iu WHERE iu.institution_id = institutions.id AND iu.user_id = auth.uid())
);
DROP POLICY IF EXISTS institutions_insert ON public.institutions;
CREATE POLICY institutions_insert ON public.institutions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS institutions_update ON public.institutions;
CREATE POLICY institutions_update ON public.institutions FOR UPDATE TO authenticated
USING (public.is_official(auth.uid()))
WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS institution_users_select ON public.institution_users;
CREATE POLICY institution_users_select ON public.institution_users FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_official(auth.uid()));
DROP POLICY IF EXISTS institution_users_insert ON public.institution_users;
CREATE POLICY institution_users_insert ON public.institution_users FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_official(auth.uid()));
DROP POLICY IF EXISTS institution_users_update ON public.institution_users;
CREATE POLICY institution_users_update ON public.institution_users FOR UPDATE TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));

-- Config tables: readable by all signed-in users, writable by officials.
DROP POLICY IF EXISTS regions_select ON public.regions;
CREATE POLICY regions_select ON public.regions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS regions_write ON public.regions;
CREATE POLICY regions_write ON public.regions FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS bureaus_select ON public.bureaus;
CREATE POLICY bureaus_select ON public.bureaus FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS bureaus_write ON public.bureaus;
CREATE POLICY bureaus_write ON public.bureaus FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS app_types_select ON public.application_types;
CREATE POLICY app_types_select ON public.application_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS app_types_write ON public.application_types;
CREATE POLICY app_types_write ON public.application_types FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS wf_templates_select ON public.workflow_templates;
CREATE POLICY wf_templates_select ON public.workflow_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS wf_templates_write ON public.workflow_templates;
CREATE POLICY wf_templates_write ON public.workflow_templates FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS wf_stages_select ON public.workflow_stages;
CREATE POLICY wf_stages_select ON public.workflow_stages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS wf_stages_write ON public.workflow_stages;
CREATE POLICY wf_stages_write ON public.workflow_stages FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS reg_rules_select ON public.regulatory_rules;
CREATE POLICY reg_rules_select ON public.regulatory_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reg_rules_write ON public.regulatory_rules;
CREATE POLICY reg_rules_write ON public.regulatory_rules FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS sla_select ON public.sla_configurations;
CREATE POLICY sla_select ON public.sla_configurations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sla_write ON public.sla_configurations;
CREATE POLICY sla_write ON public.sla_configurations FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));

-- Workflow progress tables: creator or officials.
DROP POLICY IF EXISTS stage_history_select ON public.application_stage_history;
CREATE POLICY stage_history_select ON public.application_stage_history FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.created_by = auth.uid())
);
DROP POLICY IF EXISTS stage_history_write ON public.application_stage_history;
CREATE POLICY stage_history_write ON public.application_stage_history FOR INSERT TO authenticated
WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS stage_history_complete ON public.application_stage_history;
CREATE POLICY stage_history_complete ON public.application_stage_history FOR UPDATE TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS stage_obs_select ON public.stage_observations;
CREATE POLICY stage_obs_select ON public.stage_observations FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.created_by = auth.uid())
);
DROP POLICY IF EXISTS stage_obs_write ON public.stage_observations;
CREATE POLICY stage_obs_write ON public.stage_observations FOR INSERT TO authenticated
WITH CHECK (public.is_official(auth.uid()) OR officer_id = auth.uid());

DROP POLICY IF EXISTS clarif_select ON public.clarification_requests;
CREATE POLICY clarif_select ON public.clarification_requests FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.created_by = auth.uid())
);
DROP POLICY IF EXISTS clarif_insert ON public.clarification_requests;
CREATE POLICY clarif_insert ON public.clarification_requests FOR INSERT TO authenticated
WITH CHECK (public.is_official(auth.uid()));
DROP POLICY IF EXISTS clarif_update ON public.clarification_requests;
CREATE POLICY clarif_update ON public.clarification_requests FOR UPDATE TO authenticated
USING (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.created_by = auth.uid())
) WITH CHECK (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.created_by = auth.uid())
);

-- EVC: officials manage, creator can view own.
DROP POLICY IF EXISTS evc_select ON public.evc_records;
CREATE POLICY evc_select ON public.evc_records FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.created_by = auth.uid())
);
DROP POLICY IF EXISTS evc_write ON public.evc_records;
CREATE POLICY evc_write ON public.evc_records FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));

-- Undertakings: creator institution sees own; officials manage.
DROP POLICY IF EXISTS undertakings_select ON public.undertakings;
CREATE POLICY undertakings_select ON public.undertakings FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR created_by = auth.uid()
  OR institution_id IS NULL
  OR EXISTS (SELECT 1 FROM public.institution_users iu WHERE iu.institution_id = undertakings.institution_id AND iu.user_id = auth.uid())
);
DROP POLICY IF EXISTS undertakings_write ON public.undertakings;
CREATE POLICY undertakings_write ON public.undertakings FOR ALL TO authenticated
USING (public.is_official(auth.uid())) WITH CHECK (public.is_official(auth.uid()));

DROP POLICY IF EXISTS u_sub_select ON public.undertaking_submissions;
CREATE POLICY u_sub_select ON public.undertaking_submissions FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR submitted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.undertakings u
    JOIN public.institution_users iu ON iu.institution_id = u.institution_id
    WHERE u.id = undertaking_id AND iu.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS u_sub_insert ON public.undertaking_submissions;
CREATE POLICY u_sub_insert ON public.undertaking_submissions FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid() OR public.is_official(auth.uid()));
DROP POLICY IF EXISTS u_sub_update ON public.undertaking_submissions;
CREATE POLICY u_sub_update ON public.undertaking_submissions FOR UPDATE TO authenticated
USING (public.is_official(auth.uid()) OR submitted_by = auth.uid())
WITH CHECK (public.is_official(auth.uid()) OR submitted_by = auth.uid());

-- Compliance documents.
DROP POLICY IF EXISTS comp_docs_select ON public.compliance_documents;
CREATE POLICY comp_docs_select ON public.compliance_documents FOR SELECT TO authenticated
USING (
  public.is_official(auth.uid())
  OR uploaded_by = auth.uid()
  OR institution_id IS NULL
  OR EXISTS (SELECT 1 FROM public.institution_users iu WHERE iu.institution_id = compliance_documents.institution_id AND iu.user_id = auth.uid())
);
DROP POLICY IF EXISTS comp_docs_insert ON public.compliance_documents;
CREATE POLICY comp_docs_insert ON public.compliance_documents FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() OR public.is_official(auth.uid()));
DROP POLICY IF EXISTS comp_docs_update ON public.compliance_documents;
CREATE POLICY comp_docs_update ON public.compliance_documents FOR UPDATE TO authenticated
USING (public.is_official(auth.uid()) OR uploaded_by = auth.uid())
WITH CHECK (public.is_official(auth.uid()) OR uploaded_by = auth.uid());

-- Escalations: officials view, service role writes via the SLA scan job.
DROP POLICY IF EXISTS escalations_select ON public.escalation_records;
CREATE POLICY escalations_select ON public.escalation_records FOR SELECT TO authenticated
USING (public.is_official(auth.uid()));

-- ===== DEMO seed data (synthetic, clearly labelled) =====
INSERT INTO public.regions (code, name) VALUES
  ('NR','Northern Region (DEMO)'),('SR','Southern Region (DEMO)'),('ER','Eastern Region (DEMO)'),
  ('WR','Western Region (DEMO)'),('CR','Central Region (DEMO)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.bureaus (code, name) VALUES
  ('APPR','Approval Bureau (DEMO)'),('COMP','Compliance Bureau (DEMO)'),('EVCB','EVC Coordination Cell (DEMO)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.application_types (code, name) VALUES
  ('NEW_INST','New Institution Approval (DEMO)'),('EXT_AO','Extension of Approval (DEMO)'),
  ('NEW_COURSE','Introduction of New Course (DEMO)'),('NAME_ADDR','Name / Address Change (DEMO)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.workflow_templates (id, name, application_type, aph_version, config_status) VALUES
  ('11111111-1111-1111-1111-111111111111','DEMO Route A — Scrutiny + EVC + Committee','NEW_INST','DEMO-APH-1.0','prototype_demo'),
  ('22222222-2222-2222-2222-222222222222','DEMO Route B — Scrutiny Only','EXT_AO','DEMO-APH-1.0','prototype_demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workflow_stages (template_id, stage_order, stage_code, stage_name, responsible_role, responsible_bureau, timeline_days, entry_conditions, completion_conditions) VALUES
  ('11111111-1111-1111-1111-111111111111',1,'initial_scrutiny','Initial Scrutiny','reviewer','APPR',15,'Application submitted with required documents','Observations recorded and deficiency check complete'),
  ('11111111-1111-1111-1111-111111111111',2,'evc','Expert Visit Committee (EVC)','evc_coordinator','EVCB',30,'Scrutiny complete with no blocking deficiency','EVC visit completed and observations recorded'),
  ('11111111-1111-1111-1111-111111111111',3,'committee_review','Committee Review (SAC/SHC)','competent_authority','APPR',20,'EVC observations available','Committee recommendation recorded'),
  ('11111111-1111-1111-1111-111111111111',4,'competent_authority','Competent Authority Decision','competent_authority','APPR',10,'Committee recommendation available','Authorized decision recorded'),
  ('22222222-2222-2222-2222-222222222222',1,'initial_scrutiny','Initial Scrutiny','reviewer','APPR',15,'Application submitted with required documents','Observations recorded and deficiency check complete'),
  ('22222222-2222-2222-2222-222222222222',2,'competent_authority','Competent Authority Decision','competent_authority','APPR',10,'Scrutiny complete with no blocking deficiency','Authorized decision recorded')
ON CONFLICT DO NOTHING;

INSERT INTO public.regulatory_rules (rule_name, description, source_document, aph_version, config_status, timeline_days) VALUES
  ('DEMO — Undertaking compliance window','Approval conditions may carry a compliance undertaking with a due date set from the configured rule.','Workflow Configuration Centre (prototype)','DEMO-APH-1.0','prototype_demo',90),
  ('DEMO — Lease document validity watch','Registered lease and prescribed documents are monitored for expiry with configurable reminders.','Workflow Configuration Centre (prototype)','DEMO-APH-1.0','prototype_demo',60),
  ('PENDING SOURCE — Stage timelines','Stage timelines shown are prototype demonstration defaults pending official source configuration.','—','DEMO-APH-1.0','pending_source',15)
ON CONFLICT DO NOTHING;

INSERT INTO public.sla_configurations (name, scope, timeline_days, alert_before_days) VALUES
  ('DEMO — Global document expiry alerts','global',NULL,'{90,60,30,15,7}'),
  ('DEMO — Undertaking due alerts','undertaking',NULL,'{30,15,7,1}')
ON CONFLICT DO NOTHING;

INSERT INTO public.document_requirements (id, document_category, requirement_name, description, required, active, aph_version, expiry_date_required)
VALUES
  ('33333333-3333-3333-3333-333333333331','lease_agreement','Lease Agreement (DEMO)','Lease deed for the premises. Demonstration requirement — expiry monitored when provided.',false,true,'DEMO-APH-1.0',true),
  ('33333333-3333-3333-3333-333333333332','fire_safety_certificate','Fire Safety Certificate (DEMO)','Valid fire safety certificate. Demonstration requirement — validity monitored when provided.',false,true,'DEMO-APH-1.0',true),
  ('33333333-3333-3333-3333-333333333333','building_approval','Building Approval Documents (DEMO)','Sanctioned building plan / approval. Demonstration requirement.',false,true,'DEMO-APH-1.0',false)
ON CONFLICT (id) DO NOTHING;