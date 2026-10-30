# VeriAI → SIH26262 Transformation Roadmap

Product: VeriAI – AICTE Approval Workflow and Institutional Compliance Management Platform.
Legacy SIH26261 verification stays intact, archived for admins.

## Phase 1 — Inspection & safe migration ✅
- [x] Inspect existing routes, roles, schema, RLS, storage, verification engine
- [x] All legacy tables/data preserved; legacy statuses untouched

## Phase 2 — Core approval workflow ✅ (engine) / in progress (UI)
- [x] DB migration: institutions, workflow templates/stages, stage history, clarifications,
      AICTE columns on applications, new roles, is_official()
- [ ] Seed APH-based document requirements + demo workflow routes/rules/SLA (config migration)
- [x] Workflow engine server functions (submit→route→stage, complete, return, decision, queues)
- [ ] AICTE application wizard (category, funding type, building age, programme details)
- [ ] Application detail: APH checklist, stage timeline, officer actions
- [ ] Stage-wise processing queues (officials)
- [ ] Role-aware dashboards (institution / official / admin)
- [ ] Legacy archive section (admin)

## Phase 3 — EVC management
- [ ] EVC queue + scheduling + committee assignment + observations UI

## Phase 4 — Compliance management
- [ ] Undertaking tracker UI (institution + official views, evidence, verification)
- [ ] Document validity & renewal tracker UI (lease etc., version chain)

## Phase 5 — Monitoring & escalation
- [ ] Pendency dashboard, ageing, bottleneck stats
- [ ] Daily SLA scan job (backend scheduled reminders, overdue, escalation records)

## Phase 6 — Reports, audit, security
- [ ] CSV/PDF reports page (pendency, EVC, undertakings, expiry, workload)
- [ ] Audit trail surfaces
- [ ] APH Rules & Checklist Configuration (admin)
- [ ] End-to-end browser verification + final implementation report
