# VeriAI → SIH26262 Transformation Roadmap

Product: VeriAI – AICTE Approval Workflow and Institutional Compliance Management Platform.
Legacy SIH26261 verification stays intact, archived for admins.

## Phase 1 — Inspection & safe migration ✅
- [x] Inspect existing routes, roles, schema, RLS, storage, verification engine
- [x] All legacy tables/data preserved; legacy statuses untouched

## Phase 2 — Core approval workflow (in progress)
- [x] DB migration: institutions, institution_users, regions, bureaus, application_types,
      workflow_templates, workflow_stages, application_stage_history, stage_observations,
      clarification_requests + additive AICTE columns on applications + new roles
      (regional_officer, evc_coordinator, competent_authority), is_official()
- [ ] Seed DEMO workflow config (templates, stages, rules, SLA, doc requirements)
- [ ] Workflow engine server functions (submit→route→stage, complete stage, return/revert, decision)
- [ ] AICTE application wizard (institution + approval details + route selection)
- [ ] Application detail: stage timeline, observations, officer actions
- [ ] Stage-wise processing queues (officials)
- [ ] Role-aware dashboards (institution / official / admin)
- [ ] Legacy archive section (admin)

## Phase 3 — EVC management
- [ ] EVC queue + scheduling + committee assignment + observations
- [ ] EVC due-date alerts

## Phase 4 — Compliance management
- [ ] Undertaking tracker (institution + official views, evidence upload, verification)
- [ ] Document validity & renewal tracker (lease etc., version chain)

## Phase 5 — Monitoring & escalation
- [ ] Pendency dashboard, ageing, bottleneck stats
- [ ] Daily SLA scan job (reminders, overdue, escalation records)
- [ ] Alert centre enhancements

## Phase 6 — Reports, audit, security
- [ ] CSV/PDF reports (pendency, EVC, undertakings, expiry, workload)
- [ ] Audit trail surfaces
- [ ] End-to-end browser verification of Demo A–E flows
- [ ] Final implementation report
