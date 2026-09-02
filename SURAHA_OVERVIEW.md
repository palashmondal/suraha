# SURAHA — Project Base Document & Total Overview

**সুরাহা** — A module-based digital platform for government service delivery at the upazila level of
Bangladesh.

**Prepared for:** SEAL Foundation
**Domain:** `suraha.net` (per-upazila subdomains, e.g. `golachipa.suraha.net`,
`dumuria.suraha.gov.bd`)
**Design source of truth:** [`concept_ui/`](concept_ui/) screenshots +
Figma → https://www.figma.com/design/eywg5k7XOILjdYc7Gzarqm/Suraha-app
**Companion doc:** [SURAHA_BUILD_PROMPT.md](SURAHA_BUILD_PROMPT.md) (the technical build instructions)

---

## 1. Executive Summary

Suraha is a centralized, multi-tenant web platform that brings core field-administration and citizen
services of a Bangladesh upazila into a single, Bangla-language site. It digitizes the work of
frontline officers (Family Welfare Assistants, Union Parishad Sochibs, UNOs, investigating officers)
and gives citizens a simple way to request appointments, file and track complaints, and access public
information — all under one dashboard, per upazila, with light and dark themes.

The system is **module-based**: some modules are connected (pregnancy care flows automatically into
birth registration), others are standalone (complaints, appointments, awareness sliders). SEAL
Foundation operates it centrally today and can hand a single upazila off to self-hosting later.

**Core value:** less paperwork and manual follow-up, faster and more transparent citizen services, a
verifiable audit trail, and — most notably — an **automated pregnancy-to-birth-certificate pipeline**
that turns field data already collected by an FWA into a BDRIS birth registration without re-entry.

---

## 2. Problem & Opportunity

- Upazila-level services (maternal health tracking, birth registration, appointments, complaints) are
  fragmented, paper-heavy, and hard to track for both officials and citizens.
- Field data (e.g. a pregnant mother's full profile) is collected once but re-entered many times.
- Citizens lack a transparent way to file and follow a complaint or book time with the UNO.
- Oversight (DC, and a supporting foundation) has no consolidated, real-time view across upazilas.

**Opportunity:** one platform, replicated per upazila, that captures data once, automates hand-offs
(pregnancy → BDRIS birth certificate), standardizes citizen services, and rolls up statistics for
district and national oversight.

---

## 3. Business Model

**Operator:** SEAL Foundation provides the **server, the domain and subdomains, training, and ongoing
maintenance**. This is a social-impact / govtech operating model rather than a consumer SaaS.

- **Delivery model:** SEAL onboards an upazila → provisions a subdomain → trains officers → maintains
  the deployment. Rollout expands upazila by upazila across districts.
- **Hosting evolution:** **centralized now** (single codebase and infrastructure, all upazilas as
  tenants). **Self-hostable later** — an individual upazila that wants its own infrastructure can be
  split out from the same codebase with configuration only.
- **Value to stakeholders:**
  - *Government/upazila:* digital administration, transparency, automated birth registration, ready
    statistics — at effectively no build cost.
  - *Citizens:* a single, free, Bangla site to get services and track them.
  - *SEAL Foundation:* a replicable social-impact product; potential support/hosting/training
    arrangements with government or development partners; a data-backed oversight layer.
- **Sustainability levers (optional):** government or donor-funded maintenance contracts, per-upazila
  hosting/support packages, and training programs. (Kept as levers — the base model is provision +
  train + maintain.)

---

## 4. Users, Roles & Access

| Role | Bangla | Scope | What they do |
|---|---|---|---|
| Family Welfare Assistant (FWA) | পরিবার কল্যাণ সহকারী | Own union/ward | Mobile field capture of pregnant mothers' full profile; stage updates; **confirm delivery**. |
| Union Parishad Sochib | ইউপি সচিব | Own union | Reviews FWA data; on delivery **approves** → auto **BDRIS** birth registration; manages birth records. |
| UNO | উপজেলা নির্বাহী কর্মকর্তা | One upazila | Manages **appointments** and **complaints** (schedule, assign, resolve). |
| Investigating Officer | তদন্ত কর্মকর্তা | Assigned complaints | Own dashboard; investigates assigned complaints and submits **findings**. |
| DC (Deputy Commissioner) | জেলা প্রশাসক | District (all its upazilas) | **Read-only** superior dashboard; switches between upazilas; **no actions**. |
| SEAL Admin (Super Admin) | সুরাহা অ্যাডমিন | All upazilas | Full admin; all-upazila aggregate dashboard + switch into any upazila; manages tenants, officers, content. |
| Citizen (Public) | নাগরিক | Public area | Registers with **mobile + OTP**; books appointments, files & **tracks** complaints; reads public info. |

Access is enforced by **role + tenant (upazila) scope** on every route. DC is read-only server-side;
SEAL and DC are the only cross-tenant roles (SEAL = all, DC = one district).

---

## 5. Feature Catalog

**Platform / shell**
- Per-upazila subdomain, Bangla UI (Bangla numerals), **light & dark** themes.
- MD3 shell: sidebar with icons + expandable sub-menus, top bar with **upazila switcher**,
  **notification bell**, and **profile** (name + role).
- Role-specific dashboards; SEAL all-upazila aggregate; DC district-wide read-only.

**প্রসূতি কল্যাণ — Pregnancy welfare** (connected → birth registration)
- List with tabs (all / not-delivered / delivered), counts, "N new" badges, search/filter.
- Multi-step add form (general → address → health → delivery) with right-rail stepper.
- Rich tabbed detail + right panel with delivery-status control and, once delivered, the red
  **"জন্ম নিবন্ধন তৈরি করুন"** action.
- GPS **live location** tracking of the mother.

**জন্ম নিবন্ধন — Birth registration** (connected ← pregnancy)
- Auto-created from an approved delivery via **BDRIS**; also manual entry.
- List with status (entry pending / done) and BDRIS registration numbers; downloadable certificate.

**সাক্ষাৎকার — Appointments (UNO)**
- Citizen requests an appointment; UNO **approves / rejects / reschedules**.
- List with status tabs + detail form + right-panel actions.

**অভিযোগ — Complaints** (standalone, with investigator sub-dashboards)
- Citizen files a complaint (identity, live location, address, attachment, description).
- Lifecycle: **filed → scheduled → investigator assigned → resolved/pending**, shown as a vertical
  **timeline with timestamps**.
- Investigating officers get their own dashboard and submit **findings**; UNO updates status.
- Citizens **track** their complaint end-to-end.

**ইমেজ স্লাইডার — Public-awareness sliders**
- Managed carousel (active/stopped, title, link, thumbnail) shown on the landing page and dashboard.

**কর্মকর্তা / সাধারণ তথ্য — Officers & general info**
- Officer & designation management (create accounts, assign role + scope).
- Editable public info: important phone numbers, about-the-upazila.

**রিপোর্ট — Reporting & analytics**
- Per-module operational reports (filter by date/union/ward/status) exportable to **PDF & Excel**.
- **Oversight rollups:** DC sees read-only district-wide analytics/charts across its upazilas; SEAL
  sees all-upazila aggregates and can switch into any single upazila's reports.

**Cross-cutting**
- Citizen registration/login via **mobile + SMS OTP**; officers via **admin-created credentials**
  (no NID/SSO). **Filing a complaint or booking an appointment requires a citizen account.**
- FWA field capture is delivered as an **installable PWA** (offline queue + background sync + GPS/camera).
- Profile management (image upload, password change, designation).
- **Notifications are in-app only** (bell + "N new" badges); SMS is used **only** for login OTP —
  citizens track status by logging in.
- Audit logging of every state change; centralized error/bug logging & monitoring.
- **Bangla-only UI** (no language toggle); English captured only in specific data fields.

**Public site (per subdomain)**
- Landing page: graphical feature overview + awareness sliders + CTAs (place appointment, file
  complaint, login, register).

---

## 6. Modules & Connectivity

```
                         ┌─────────────────────────────┐
                         │        SURAHA SHELL          │
                         │  (per-upazila subdomain)     │
                         │  Bangla · light/dark · RBAC  │
                         └──────────────┬──────────────┘
                                        │
   ┌───────────────┬─────────────┬──────┴───────┬──────────────┬───────────────┐
   ▼               ▼             ▼              ▼              ▼               ▼
প্রসূতি কল্যাণ ══▶ জন্ম নিবন্ধন   সাক্ষাৎকার      অভিযোগ         ইমেজ স্লাইডার   কর্মকর্তা /
(Pregnancy)  connected  (Birth Reg) (Appointment) (Complaint)    (Sliders)      সাধারণ তথ্য
   │  FWA→Sochib→BDRIS         │ UNO          │ UNO + officers   │ public         (admin/content)
   │                          │              │                  │
   └── auto birth certificate ┘              └── investigator dashboards
```

- **Connected:** Pregnancy → Birth Registration (delivery approval auto-triggers BDRIS).
- **Standalone:** Appointments, Complaints, Sliders, Officers/General-info — independent but share the
  shell, RBAC, notifications, and design system.

---

## 7. Key Flows

### 7.1 Pregnancy → Birth Certificate (the signature flow)
1. **FWA** visits the household and captures the mother's **full profile** on mobile (general,
   address+GPS, health, expected delivery) → record = `ডেলিভারী হয়নি`.
2. Record appears on the **Sochib** dashboard; mother receives **stage-appropriate services** as the
   pregnancy progresses.
3. On delivery, **FWA confirms delivery** and fills delivery/newborn details → `ডেলিভারি হয়েছে`.
4. **Sochib approves.** Because all required data was collected in step 1–3, approval **auto-submits a
   birth-registration request to the BDRIS API** (no re-entry).
5. BDRIS returns a registration number → Suraha **generates the birth certificate (PDF)** and makes it
   available to the parents; a birth-registration record is created/linked.

### 7.2 Complaint
1. **Citizen** (registered via mobile+OTP) files a complaint with identity, **live location**,
   address, attachment (photo/PDF), and description → `অভিযোগ দাখিল`.
2. **UNO** schedules it (`শিডিউল যুক্ত`) and **assigns an investigating officer** (`তদন্তকারী যুক্ত`).
3. **Investigating officer** investigates from their dashboard and **submits findings**.
4. **UNO** marks the complaint **resolved (`নিষ্পত্তি`)** or pending.
5. **Citizen tracks** the whole timeline with timestamps.

### 7.3 Appointment
1. **Citizen** requests a UNO appointment (reason, details, contact).
2. **UNO** approves, rejects, or reschedules.
3. **Citizen** is notified and can track status (`অপেক্ষমান → অনুমোদিত/নাকচ`).

### 7.4 Oversight
- **DC** opens a read-only district dashboard and switches between the district's upazilas to view
  statistics/records.
- **SEAL Admin** views an **all-upazila aggregate** and can switch into any single upazila.

---

## 8. Data & Integrations

**Core entities:** Upazila/Union/Ward & District registry · Users/Officers & Roles · Pregnant Mother
(full clinical + address + delivery profile) · Birth Registration + Certificate · Appointment ·
Complaint (+ schedule, investigator assignment, findings, attachments, timeline events) · Slider ·
General-info items · Notifications · Audit log.

**Integrations:**
- **BDRIS API** (real integration; mockable adapter until access is granted) — automated birth
  registration from approved deliveries; store reg number + generate certificate PDF; handle auth,
  validation, retries, idempotency.
- **SMS / OTP gateway** — citizen registration/login OTP **only** (notifications are in-app).
- **Maps / GPS** — live location capture for mothers and complaint incident sites.
- **File & PDF storage** — attachments and generated certificates (tenant-scoped).
- **Certificate generation** — system-generated birth certificate PDF.

All integrations sit behind interfaces with **per-tenant configuration**, so a self-hosted upazila can
supply its own credentials.

---

## 9. Technology Overview

**Committed stack** (see [SURAHA_BUILD_PROMPT.md](SURAHA_BUILD_PROMPT.md) §12 for full detail):

| Layer | Choice |
|---|---|
| Backend | **Laravel 11 (PHP 8.3+)** REST API, **Sanctum** auth |
| Multi-tenancy | **`stancl/tenancy`**, subdomain-based (upazila = tenant); central Postgres with scoping now, per-tenant DB export for self-host later |
| Frontend | **React (Vite) + MUI (Material Design 3)**; Bangla-only i18n; light/dark theme |
| FWA client | **Installable PWA** (Workbox service worker, IndexedDB offline queue + Background Sync, GPS/camera) |
| Database | **PostgreSQL 16** |
| Cache / queue | **Redis** + **Laravel Queue/Horizon** (BDRIS, OTP SMS, notifications, PDF, PWA sync); Scheduler |
| Object storage | **S3-compatible** (MinIO self-host / AWS S3) for attachments + certificates |
| PDF / Maps | dompdf or wkhtmltopdf; **Leaflet + OpenStreetMap** |
| Integrations | **BDRIS** (real, mockable adapter); **SMS gateway — OTP only** |
| Observability | Laravel logging + **Sentry/GlitchTip**; audit via `owen-it/laravel-auditing` |
| Deploy | **Docker Compose on a single Linux VPS** (app, postgres, redis, worker, scheduler, optional minio) behind a reverse proxy with **wildcard TLS `*.suraha.net`** (Let's Encrypt DNS-01) |

*Recommended engineering practices:* monorepo (`api/` + `web/`), CI/CD (GitHub Actions, staging +
prod), and automated tests focused on RBAC, tenant scoping, the BDRIS adapter, and the
pregnancy→certificate flow.

**Design system:** Material Design 3, violet primary, per-module accent colors (purple/charcoal/
green/maroon), rounded cards, semantic status pills (amber=pending, green=done, red=negative,
blue=scheduled), tables with tab filters + "N new" badges, right-rail steppers, vertical status
timelines, empty states — all reproduced from `concept_ui/` and Figma.

---

## 10. Non-Functional Priorities

- **Security & privacy:** sensitive PII (maternal health, complaints) — encryption in transit/at rest,
  least-privilege RBAC, strict tenant isolation, audit trails, safe file handling, server-side DC
  read-only.
- **Performance:** responsive with thousands of records per upazila (pagination/virtualization).
- **Offline tolerance:** FWA mobile capture tolerates poor connectivity (queue + sync).
- **Reliability:** backups, safe migrations, graceful BDRIS/SMS outage handling.
- **Observability & bug-fixing:** structured logs, metrics, error tracking, traceable issue capture.
- **Accessibility:** contrast in both themes, keyboard nav, adequate mobile touch targets.
- **Deployability:** containerized and config-driven for centralized hosting and future self-host.

---

## 11. Rollout & Roadmap

**Deployment model:** onboard upazila → provision subdomain → train officers → maintain; expand
upazila by upazila, district by district.

**Suggested build/rollout phases** (see build prompt §13 for detail):
1. Foundation — design system + shell (light/dark, Bangla).
2. Auth, multi-tenancy, RBAC, officer accounts, profiles.
3. Role dashboards + SEAL aggregate + DC district switcher.
4. Pregnancy + BDRIS → Birth Registration.
5. Complaints (+ investigator dashboards).
6. Appointments.
7. Public site (landing, register/OTP, place & track).
8. Sliders & general info.
9. Notifications, audit + bug logging, polish, full Bangla + dark/light QA.

**Future:** per-upazila self-hosting; deeper reporting/analytics for DC & SEAL; additional service
modules on the same shell.

---

## 12. Success Criteria

- Officers run their daily work in Suraha instead of on paper; citizens self-serve appointments and
  complaints and can track them.
- The pregnancy→BDRIS→certificate pipeline issues certificates without data re-entry.
- Every screen matches the fixed design, in Bangla, in both themes; RBAC and tenant scoping hold.
- SEAL sees consolidated all-upazila statistics; DC sees its district read-only.
- A single upazila can be exported to self-host with configuration only.

---

*End of base document. Technical build details: [SURAHA_BUILD_PROMPT.md](SURAHA_BUILD_PROMPT.md).*
