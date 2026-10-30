-- SIH26262: AICTE approval checklist + compliance module foundation.
-- Additive only; legacy rows and columns are preserved.

ALTER TABLE public.applications
  ADD COLUMN funding_type text,
  ADD COLUMN building_completion_date date,
  ADD COLUMN programme_details text;
COMMENT ON COLUMN public.applications.funding_type IS 'Government / Government-aided / Self-financing classification used for APH applicability';
COMMENT ON COLUMN public.applications.building_completion_date IS 'Completion Certificate issue date; drives the 30-year Structural Stability Certificate condition (APH Annexure-2 Clause 2.1)';
COMMENT ON COLUMN public.applications.programme_details IS 'Programme / course details for the application';

ALTER TABLE public.documents
  ADD COLUMN aph_clause_reference text,
  ADD COLUMN requirement_classification text,
  ADD COLUMN correction_reason text;
COMMENT ON COLUMN public.documents.aph_clause_reference IS 'APH handbook annexure/clause source recorded per uploaded document';
COMMENT ON COLUMN public.documents.requirement_classification IS 'mandatory | conditional | optional classification from the APH requirement';
COMMENT ON COLUMN public.documents.correction_reason IS 'Reviewer correction reason when status is correction_requested';

-- Retire the generic demo requirement labels (kept as inactive rows so legacy
-- uploaded documents keep their history; nothing is deleted).
UPDATE public.document_requirements
SET active = false,
    description = 'RETIRED DEMO ITEM — replaced by the APH-based AICTE Approval Document Checklist'
WHERE document_category IN (
  'institution_registration_certificate','society_or_trust_deed',
  'recognition_or_affiliation_approval','annual_report'
);

-- Application category master (SIH26262 AICTE categories).
INSERT INTO public.application_types (code, name, active) VALUES
  ('new_institution','New Technical Institution – Approval',true),
  ('eoa','Existing Institution – Extension of Approval (EoA)',true),
  ('eoa_break','EoA after Break / Restoration of Intake',true),
  ('increase_intake','Increase in Intake',true),
  ('new_programme','Additional Course / New Programme / New Level',true),
  ('change_site','Change of Site / Location',true),
  ('conversion','Conversion of Institution Type',true),
  ('merger','Merger of Institutions',true),
  ('other','Other AICTE approval categories',true)
ON CONFLICT DO NOTHING;

-- APH-based document requirements. Every row carries its APH source; rows the
-- prototype could not verify against an official published clause are marked
-- in the description with 'Pending Official Rule Configuration'.
INSERT INTO public.document_requirements
  (document_category, requirement_name, description, required, active,
   applicable_institution_type, applicable_application_type, aph_version,
   issue_date_required, expiry_date_required)
VALUES
  ('affidavit_2','Affidavit 2','Digitally signed on Rs.100 e-stamp paper and sworn before the prescribed authority. Must be authenticated by the authorized signatory (Chairman/Secretary of Trust/Society/Company for self-financing institutions).',true,true,NULL,'eoa','2024-2027',true,false),
  ('payment_receipt','AICTE Portal Payment Receipt','Payment receipt for the respective academic year — required when the payment has been made.',true,true,NULL,'eoa','2024-2027',true,false),
  ('occupancy_certificate','Occupancy / Completion Certificate / Building License / Form D','Valid certificate issued by the competent authority.',true,true,NULL,'eoa','2024-2027',true,false),
  ('structural_stability','Structural Stability Certificate','From a registered Structural Engineer — CONDITIONAL: required only when the building is more than 30 years old from the issue of the Completion Certificate.',false,true,NULL,'eoa','2024-2027',true,false),
  ('fire_safety_certificate','Valid Fire Safety Certificate','Issued by the competent authority.',true,true,NULL,'eoa','2024-2027',true,true),
  ('satellite_map','Satellite Map with Latitude & Longitude','Satellite map showing the institution location with latitude and longitude at the entrance of the main building.',true,true,NULL,'eoa','2024-2027',false,false),
  ('audited_accounts','Previous Year Audited Statement of Accounts','Audited statement of accounts of the Trust / Society / Company for the previous year.',true,true,NULL,'eoa','2024-2027',false,false),
  ('approved_building_plan','Approved Building Plan','Prepared by a qualified Architect / Licensed Surveyor and approved by the competent authority.',true,true,NULL,'new_institution','2024-2027',true,false),
  ('organization_resolution_format3','Applicant Organization Resolution (Format 3)','Resolution of the Trust / Society / Company in Format 3.',true,true,NULL,'new_institution','2024-2027',true,false),
  ('bank_manager_certificate','Bank Manager Certificate','Certificate from the Bank Manager regarding financial status.',true,true,NULL,'new_institution','2024-2027',false,false),
  ('aicte_application_copy','Complete AICTE Application Copy','Complete copy of the application submitted on the AICTE portal.',true,true,NULL,'new_institution','2024-2027',false,false),
  ('trust_registration_moa','Trust / Society / Company Registration Documents','Registration documents including MoA and Rules, as applicable.',true,true,NULL,'new_institution','2024-2027',false,false),
  ('land_building_ownership','Land / Building Ownership or Registered Lease Documents','Ownership documents or registered lease documents according to APH requirements; additional documents depend on the type of land/building ownership.',true,true,NULL,'new_institution','2024-2027',true,true),
  ('noc_university_format2','NOC from Affiliating University / Board (Format 2)','Where applicable, for New Programme / Level / Change of Site applications.',true,true,NULL,'new_programme','2024-2027',true,false),
  ('noc_university_format2_site','NOC from Affiliating University / Board (Format 2)','Where applicable, for Change of Site / Location applications.',true,true,NULL,'change_site','2024-2027',true,false),
  ('affidavit_8','Affidavit 8','Applicable for Increase in Intake / Additional Course applications; not applicable for Extended EoA.',true,true,NULL,'increase_intake','2024-2027',true,false),
  ('resolution_additional_course','Trust / Society / Company Resolution for Additional Course(s)','Resolution approving the proposed additional course(s) / division(s).',true,true,NULL,'increase_intake','2024-2027',true,false),
  ('faculty_infrastructure_evidence','Evidence of Faculty and Infrastructure Availability','As applicable for Increase in Intake / Additional Course applications.',true,true,NULL,'increase_intake','2024-2027',false,false),
  ('resolution_additional_course_prog','Trust / Society / Company Resolution for New Programme','Resolution for the proposed new programme / level.',true,true,NULL,'new_programme','2024-2027',true,false),
  ('affidavit_2_new','Affidavit 2','Digitally signed on Rs.100 e-stamp paper and sworn before the prescribed authority (Annexure-1).',true,true,NULL,'new_institution','2024-2027',true,false),
  ('fire_safety_new','Valid Fire Safety Certificate','Issued by the competent authority (Annexure-1).',true,true,NULL,'new_institution','2024-2027',true,true),
  ('occupancy_certificate_new','Occupancy Certificate / Completion Certificate / Building License / Form D','As applicable, from the competent authority (Annexure-1).',true,true,NULL,'new_institution','2024-2027',true,false)
ON CONFLICT DO NOTHING;

-- Demo processing routes (prototype configuration — not official AICTE routes).
INSERT INTO public.workflow_templates (name, application_type, aph_version, effective_from, active, config_status, created_by)
SELECT t.name, t.app_type, '2024-2027', CURRENT_DATE, true, 'prototype_demo', NULL
FROM (VALUES
  ('EoA – Scrutiny Only (Prototype Demo)','eoa'),
  ('EoA – Scrutiny + EVC (Prototype Demo)','eoa'),
  ('New Institution – Scrutiny + EVC (Prototype Demo)','new_institution'),
  ('Other Categories – Scrutiny + EVC (Prototype Demo)','other')
) AS t(name, app_type)
WHERE NOT EXISTS (SELECT 1 FROM public.workflow_templates WHERE config_status = 'prototype_demo');

INSERT INTO public.workflow_stages (template_id, stage_order, stage_code, stage_name, responsible_role, responsible_bureau, timeline_days, allow_return)
SELECT tpl.id, s.stage_order, s.stage_code, s.stage_name, s.role, s.bureau, s.days, true
FROM public.workflow_templates tpl
JOIN (VALUES
  ('EoA – Scrutiny Only (Prototype Demo)',1,'initial_scrutiny','Initial Scrutiny','reviewer','Scrutiny Bureau',7),
  ('EoA – Scrutiny Only (Prototype Demo)',2,'competent_authority','Competent Authority Decision','competent_authority','Approval Bureau',5),
  ('EoA – Scrutiny + EVC (Prototype Demo)',1,'initial_scrutiny','Initial Scrutiny','reviewer','Scrutiny Bureau',7),
  ('EoA – Scrutiny + EVC (Prototype Demo)',2,'evc','Expert Visit Committee (EVC)','evc_coordinator','EVC Bureau',15),
  ('EoA – Scrutiny + EVC (Prototype Demo)',3,'competent_authority','Competent Authority Decision','competent_authority','Approval Bureau',5),
  ('New Institution – Scrutiny + EVC (Prototype Demo)',1,'initial_scrutiny','Initial Scrutiny','reviewer','Scrutiny Bureau',7),
  ('New Institution – Scrutiny + EVC (Prototype Demo)',2,'evc','Expert Visit Committee (EVC)','evc_coordinator','EVC Bureau',15),
  ('New Institution – Scrutiny + EVC (Prototype Demo)',3,'competent_authority','Competent Authority Decision','competent_authority','Approval Bureau',5),
  ('Other Categories – Scrutiny + EVC (Prototype Demo)',1,'initial_scrutiny','Initial Scrutiny','reviewer','Scrutiny Bureau',7),
  ('Other Categories – Scrutiny + EVC (Prototype Demo)',2,'evc','Expert Visit Committee (EVC)','evc_coordinator','EVC Bureau',15),
  ('Other Categories – Scrutiny + EVC (Prototype Demo)',3,'competent_authority','Competent Authority Decision','competent_authority','Approval Bureau',5)
) AS s(tpl_name, stage_order, stage_code, stage_name, role, bureau, days) ON s.tpl_name = tpl.name
WHERE NOT EXISTS (SELECT 1 FROM public.workflow_stages ws WHERE ws.template_id = tpl.id);

-- Configured regulatory rules for the checklist engine.
INSERT INTO public.regulatory_rules
  (rule_name, description, source_document, source_section, aph_version,
   applicable_application_type, timeline_days, required_documents, validation_requirement, config_status, active)
SELECT r.rule_name, r.description, r.source_document, r.source_section, '2024-2027',
       r.app_type, NULL, r.required_docs::text[], r.validation, r.config_status, true
FROM (VALUES
  ('EoA document set','Existing institutions applying for Extension of Approval on self-disclosure must submit the Annexure-2 Clause 2.1 document set.','AICTE APH 2024-2027','Annexure-2, Clause 2.1','eoa','Affidavit 2; Payment receipt; Occupancy/Completion Certificate; Fire Safety Certificate; Satellite map; Audited accounts','All Clause 2.1 documents authenticated by the appropriate authorized signatory','official'),
  ('Structural Stability 30-year condition','Structural Stability Certificate is required only when the building is more than 30 years old from the issue of the Completion Certificate.','AICTE APH 2024-2027','Annexure-2, Clause 2.1','eoa','Structural Stability Certificate','Computed from the Completion Certificate issue date captured on the application','official'),
  ('New Institution document set','New Technical Institution applications follow the Annexure-1 document set including land/building ownership or lease documents with category-specific additions.','AICTE APH 2024-2027','Annexure-1','new_institution','Approved Building Plan; Affidavit 2; Organization Resolution (Format 3); Occupancy Certificate; Fire Safety Certificate; Bank Manager Certificate; AICTE application copy; Trust registration; Land/building ownership or lease','Applicability of lease-related documents depends on the type of land/building ownership','official'),
  ('Increase in Intake additional set','Increase in Intake requires Affidavit 8 (not applicable for Extended EoA), organization resolution and evidence of faculty and infrastructure availability.','AICTE APH 2024-2027','Annexure-8 / applicable clause','increase_intake','Affidavit 8; Resolution for additional course(s)/division(s); Faculty & infrastructure evidence','Pending Official Rule Configuration — verify the exact clause before official use','pending_source'),
  ('NOC for New Programme / Change of Site','NOC from the Affiliating University / Board in Format 2 where applicable, with the organization resolution in Format 3.','AICTE APH 2024-2027','Applicable APH clause','new_programme','NOC (Format 2); Organization resolution','Pending Official Rule Configuration — verify the exact clause before official use','pending_source')
) AS r(rule_name, description, source_document, source_section, app_type, required_docs, validation, config_status)
WHERE NOT EXISTS (SELECT 1 FROM public.regulatory_rules);

-- Prototype SLA application settings (NOT official AICTE deadlines).
INSERT INTO public.sla_configurations (name, scope, timeline_days, alert_before_days, escalation_levels, active)
SELECT s.name, s.scope, s.days, ARRAY[7,3], ARRAY[1,2], true
FROM (VALUES
  ('Prototype SLA – Initial Scrutiny (application setting)','stage:initial_scrutiny',7),
  ('Prototype SLA – EVC scheduling (application setting)','stage:evc',15),
  ('Prototype SLA – Undertaking evidence (application setting)','undertaking:default',30)
) AS s(name, scope, days)
WHERE NOT EXISTS (SELECT 1 FROM public.sla_configurations);