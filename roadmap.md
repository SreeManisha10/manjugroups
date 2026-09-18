# Real Estate CRM — roadmap

## Phase 1 — Frontend only (current)
- [x] Design system tokens (Mist glass terminal)
- [x] Mock API layer + store (swappable for real backend)
- [x] Dashboard, Leads, Properties, Bookings pages
- [x] Lead drawer, lead form, booking flow, role-based permissions
- [ ] Rebrand to **Manju Groups** (logo mark, name, copy)
- [ ] Extract shared UI primitives so every button/modal/card/table/chip renders identically
- [ ] Styling polish pass + responsive check

## Phase 2 — Backend (later, on request)
- [ ] Manju Groups Cloud: tables for users/roles, leads, notes, projects, buildings, units, bookings
- [ ] Real auth with Admin / Sales Employee roles
- [ ] Unique constraint on bookings.unit_id to prevent double booking
- [ ] Replace src/lib/crm/api.ts mock bodies with real queries
