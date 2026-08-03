# SURAHA — Build Prompt for an AI Coding Agent

> **Read this whole document before writing any code.** It is the single source of truth for
> building **Suraha**, a module-based government service-delivery platform for Bangladesh upazilas.
> Build the system **module by module**, in the order given in §13, and verify each module against
> its acceptance criteria before moving on.

---

## 1. Role & Mission

You are the engineering agent building **Suraha** (Bangla: **সুরাহা**) for the **SEAL Foundation**.
Suraha is a centralized, multi-tenant web platform that digitizes field administration and citizen
services at the **upazila** (sub-district) level of Bangladesh. Each upazila is served on its own
subdomain (e.g. `golachipa.suraha.com.bd`, `dumuria.suraha.gov.bd`).

**Non-negotiable rules:**

1. **The design is fixed.** The visual design is defined by the reference screenshots in
   [`concept_ui/`](concept_ui/) and the Figma file
   **https://www.figma.com/design/eywg5k7XOILjdYc7Gzarqm/Suraha-app**. **Never invent UI, layouts,
   colors, spacing, or components.** When a screen exists in `concept_ui/`, reproduce it faithfully.
   When it does not, derive the new screen from the closest existing component in the design system
   (§6). Pull exact color, radius, spacing, and type values from Figma/the screenshots — do not
   guess them.
2. **Bangla first.** The entire product UI is in **Bengali (Bangla)**. All labels, buttons, table
   headers, empty states, and messages are in Bangla. A few data fields also capture an English
   value (e.g. mother's name in English) — those are data, not UI language. Numerals shown in the
   mockups are Bangla numerals (১, ২, ৩ …).
3. **Light and dark themes.** Every screen must support both. Respect the viewer's theme and provide
   a toggle. The dashboard mockups show both a light variant and a colored/dark-accent variant.
4. **Module-based.** The system is a set of modules (§8). Some are connected (pregnancy → birth
   registration), some are standalone (complaints, appointments, sliders). Build them as separable
   units behind a shared shell and design system.
5. **Multi-tenant from day one, self-hostable later** (§4).

Keep the prompt's terminology: use the Bangla labels exactly as they appear in the mockups
(examples given throughout).

### 1.1 Locked product decisions (build to these)

These were decided by the product owner — treat them as fixed constraints:

1. **BDRIS integration = real API.** SEAL will secure official BDRIS API/gateway access. Build a live
   integration (auth, submit, retry, idempotency) **behind a config-driven interface** so credentials/
   endpoints are configuration and a self-hosted upazila can supply its own. Do **not** build a
   parallel manual path; do build a swappable adapter so a mock can stand in during development before
   access is granted.
2. **FWA field client = installable PWA.** The FWA experience is a **Progressive Web App**:
   installable, **offline-capable** (queue field entries locally and **background-sync** when
   connectivity returns), with **GPS and camera** access. One codebase with the web app; no native app,
   no app store.
3. **Authentication = credentials + mobile OTP.** Officers log in with **admin-created username/
   password**; citizens with **mobile number + SMS OTP**. **No** NID verification and **no** government
   SSO in scope. (The SMS gateway is therefore used **for OTP only** — see decision 4.)
4. **Notifications = in-app only.** The only notification channel is **in-app** (top-bar bell +
   "N new" badges). **No** SMS, email, or push notifications for status updates. Consequently, citizens
   learn appointment/complaint outcomes and certificate availability by **logging in and tracking**
   (and via the in-app bell). SMS is used **solely** to deliver login OTPs.
5. **UI language = Bangla only.** No language toggle. English is captured only in the few data fields
   that explicitly ask for it (e.g. mother's name in English).
6. **Public actions require an account.** Citizens **must register (mobile + OTP) and log in** before
   filing a complaint or booking an appointment. No anonymous submissions; tracking is tied to the
   citizen's account.
7. **Reporting = full analytics with oversight rollups.** Beyond per-module operational reports
   (filterable, exportable to **PDF and Excel**), provide **cross-upazila / district aggregate
   analytics with charts** for DC (their district, read-only) and SEAL (all upazilas). See §8.7.
8. **Hosting = flexible.** No stated data-residency constraint; SEAL chooses hosting. Still keep the
   app containerized and config-driven so it can run centrally now and be split to self-host later.

---

## 2. Product Overview

- **Owner / operator:** SEAL Foundation provides the server, the `suraha.com.bd` domain, per-upazila
  subdomains, training, and ongoing maintenance.
- **What it does:** a single site per upazila offering a dashboard of connected govt services —
  pregnant-mother welfare service, birth registration, UNO appointment booking, complaint
  filing & resolution, and public awareness/information.
- **Who uses it:** field & administrative officers (Family Welfare Assistant, Union Parishad Sochib,
  UNO, investigating officers), oversight (DC), the SEAL admin, and the **general public** (citizens
  who register with a mobile number to book appointments and file/track complaints).
- **Rollout:** deployed to many upazilas across Bangladesh, each on its own subdomain.
- **Now vs. later:** the system is **centralized** now (one codebase, one server, all upazilas). It
  must be architected so a single upazila can later be **exported and self-hosted** on its own
  infrastructure with minimal change.
- **The landing page** (public, per subdomain) shows graphical information about what Suraha does
  and its features, the public-awareness image sliders, and clear calls-to-action: **place a
  schedule (appointment) request**, **file a complaint**, plus **Login** and **Register** links.

---

## 3. Personas, Roles & RBAC

Suraha has multiple user levels. Each internal role gets its own dashboard scoped to its duties;
the public gets a citizen-facing area.

| Role | Bangla | Scope | Core abilities |
|---|---|---|---|
| **Family Welfare Assistant (FWA)** | পরিবার কল্যাণ সহকারী | Own union/ward, one upazila | Field data capture on **mobile**: register pregnant mothers with full detail, update pregnancy-stage info, **confirm delivery**. Sees own pregnancy list & dashboard. |
| **Union Parishad Sochib** | ইউপি সচিব | Own union, one upazila | Own dashboard; reviews FWA-submitted mothers; on delivery, **approves** and triggers the automatic **BDRIS birth-registration** request; manages birth-registration entries. |
| **UNO (Upazila Nirbahi Officer)** | উপজেলা নির্বাহী কর্মকর্তা | One upazila | Upazila dashboard. Manages **appointments** (approve/reject/reschedule) and **complaints** (assign, update status → resolved/pending). |
| **Investigating Officer** | তদন্ত কর্মকর্তা | Assigned complaints, one upazila | Own dashboard listing complaints assigned to them; submits investigation **findings/report** back into the complaint. |
| **DC (Deputy Commissioner)** | জেলা প্রশাসক | All upazilas **within their district** | **Superior, read-only** dashboard. Can **switch between upazilas** in the district and view statistics/records. **Cannot take actions.** |
| **SEAL Admin (Super Admin)** | সুরাহা অ্যাডমিন | **All** upazilas (all districts) | Full admin privilege across every dashboard. Aggregate all-upazila statistics **and** switch into any single upazila's dashboard. Manages officers, sliders, general info, tenants. |
| **Public / Citizen** | নাগরিক | Public area, per subdomain | Registers with **mobile number** (OTP). Files/books **appointments** and **complaints**, uploads attachments, and **tracks** their status. Views landing page, awareness sliders, and public info. |

**RBAC requirements:**
- Every action and route is authorized by role **and** tenant (upazila) scope. DC is read-only;
  enforce this at the API layer, not just the UI.
- SEAL Admin has an **all-upazila aggregate dashboard** plus the ability to drop into any single
  upazila (the upazila switcher in the top bar / sidebar, seen in the mockups).
- Provide an **officer management** area (পদবী / কর্মকর্তা তালিকা) to create officer accounts,
  assign designations, and set roles (visible as a sidebar sub-section in the mockups).

---

## 4. Multi-Tenancy & Hosting

- **Tenant = upazila**, resolved by **subdomain** (`{upazila}.suraha.com.bd` or
  `{upazila}.suraha.gov.bd`). Middleware resolves the tenant from the host on every request and
  scopes all queries to that upazila.
- **Data isolation:** one centralized codebase and datastore now, with **upazila_id scoping on every
  tenant-owned record** and enforced query scoping. Design the data layer so a single upazila's data
  can be cleanly **extracted/exported** for self-hosting later (keep tenant boundaries strict; avoid
  cross-tenant foreign keys except through the shared registry of upazilas/districts/roles).
- **Cross-tenant access:**
  - **SEAL Admin** operates above tenants: an aggregate dashboard over **all** upazilas, and a
    switcher to enter any one upazila.
  - **DC** operates above tenants **within one district**: read-only aggregate + switch between the
    district's upazilas only.
- **Self-host path (future):** document and structure the app so SEAL can spin up a single-upazila
  instance (its own DB/subdomain) from the same codebase with configuration only. No hard-coded
  central dependencies in tenant features.
- **Registry data** (shared, non-tenant): districts, upazilas, unions/wards, roles, and the tenant
  ↔ subdomain map.

---

## 5. Information Architecture & Navigation

Reproduce the shell exactly as in [`concept_ui/Dashboard.png`](concept_ui/Dashboard.png),
[`concept_ui/Dashboard-2.png`](concept_ui/Dashboard-2.png),
[`concept_ui/Layout.png`](concept_ui/Layout.png),
[`concept_ui/Side Navigations.png`](concept_ui/Side%20Navigations.png),
[`concept_ui/Top bar.png`](concept_ui/Top%20bar.png), and the Navigation Drawer frames.

**Top bar:** Suraha wordmark + upazila crest/logo on the left (in the sidebar header in some
variants), an **upazila switcher dropdown** (e.g. "গলাচিপা উপজেলা, বরিশাল"), a **notification bell**,
and a **profile avatar** showing name + role (e.g. "Muhammadullah — Admin").

**Left sidebar** (per [`concept_ui/Side Navigations.png`](concept_ui/Side%20Navigations.png) — this
is the authoritative component spec with Initial / Initial-Hover / Active / Active-Hover states,
leading icons, section headers, and trailing unread-count badges):

- Primary items with folder/line icons: **ড্যাশবোর্ড** (Dashboard), **প্রসূতি কল্যাণ** (Pregnancy —
  expandable → তালিকা / রিপোর্ট), **জন্ম নিবন্ধন** (Birth Registration), **সাক্ষাৎকার** (Appointment),
  **অভিযোগ** (Complaint — expandable → সকল তালিকা / কর্মকর্তা তালিকা), **ইমেজ স্লাইডার** (Image Slider).
- Section header **কর্মকর্তা** (Officers) → পদবী (Designation), কর্মকর্তা তালিকা (Officer list).
- Section header **সাধারণ তথ্য** (General Info, with a `+` add affordance) → প্রয়োজনীয় ফোন নাম্বার
  (Important phone numbers), উপজেলা সম্পর্কিত (About the upazila).
- Expandable parents show a chevron and reveal indented children (e.g. তালিকা / রিপোর্ট), with the
  active child highlighted (lavender pill) as in the pregnancy/complaint detail frames.

**Per-role menus:** show only the modules a role may use. FWA sees pregnancy (mobile-optimized);
investigating officer sees their assigned-complaints dashboard; DC/SEAL see the upazila switcher and
aggregate views; UNO sees appointments + complaints; Sochib sees pregnancy + birth registration.

**Mobile drawer:** the sidebar collapses to a navigation drawer (see the Navigation Drawer frames)
for FWA field use and small screens.

---

## 6. Design System

> Extract exact token values from the Figma file and screenshots. The values below are the
> **structure**; read the precise hex/spacing/typography from the source.

- **Base:** Material Design 3. The Side Navigation, dialogs, text fields, and top bar are MD3
  components — see [`concept_ui/Side Navigations.png`](concept_ui/Side%20Navigations.png),
  [`concept_ui/Basic dialog.png`](concept_ui/Basic%20dialog.png),
  [`concept_ui/Text field.png`](concept_ui/Text%20field.png),
  [`concept_ui/Top bar.png`](concept_ui/Top%20bar.png),
  [`concept_ui/Navigation Drawer.png`](concept_ui/Navigation%20Drawer.png).
- **Primary color:** violet/purple (used for active nav pill, primary buttons "নতুন যুক্ত করুন",
  steppers, links). Page background is a soft lavender/near-white; dark theme inverts to charcoal.
- **Module accent headers** (dashboard summary cards — see
  [`concept_ui/Frame 1171277045.png`](concept_ui/Frame%201171277045.png)): each module card has a
  distinct colored header band — **purple** for কর্মকর্তা, **charcoal/dark** for প্রসূতি কল্যাণ,
  **green** (and a **maroon** variant) for জন্ম সনদ. Reuse these accents consistently per module.
- **Cards:** rounded corners, soft borders/shadows, generous padding. Dashboard uses a
  **3-column** grid of summary cards over a 3-column grid of list cards.
- **Stat tiles:** label (Bangla) above a large value with unit (e.g. "মোট স্বাস্থ্যকর্মী — ৭ জন",
  "মোট জন্ম সনদ — ১৫ টি").
- **Status pills** (semantic, reused everywhere):
  - **Amber/orange** = pending (পেন্ডিং আছে / অপেক্ষমান / প্রক্রিয়াধীন / এন্ট্রি হয়নি).
  - **Green** = success/approved/done (অনুমোদিত / এন্ট্রি হয়েছে / ডেলিভারি হয়েছে / কর্মকর্তা নিযুক্ত).
  - **Red/maroon** = not-done/negative/destructive (ডেলিভারি হয়নি, নাকচ), and the red primary action
    "জন্ম নিবন্ধন তৈরি করুন".
  - **Blue/violet** = scheduled/informational (শিডিউল করা হয়েছে).
- **Tables:** left-aligned Bangla headers (আইডি, নাম, স্বামীর নাম, ওয়ার্ড নং, ইউনিয়ন, মোবাইল
  নাম্বার, বর্তমান অবস্থা …), status pill column, trailing 3-dot (kebab) row menu, tabs above the
  table with **"N new"** badges (amber/green) and per-tab counts (e.g. "মোট ১২৩৬ জন").
- **Forms:** MD3 text fields, dropdowns, date (mm/dd/yyyy) and time pickers, file/PDF attach,
  radio groups; multi-step forms use a **right-rail vertical stepper** (see
  [`concept_ui/Frame 1171277053.png`](concept_ui/Frame%201171277053.png)).
- **Detail views:** tabbed content on the left, a **sticky right panel** summarizing the subject and
  holding the primary status control + actions (see the pregnancy, appointment, and complaint detail
  frames).
- **Timeline:** vertical status timeline with filled/hollow nodes and timestamps (complaint detail —
  [`concept_ui/Frame 1171277087.png`](concept_ui/Frame%201171277087.png),
  [`concept_ui/Frame 1321316786.png`](concept_ui/Frame%201321316786.png)).
- **Empty state:** centered inbox icon + "কোনো তথ্য নাই" + helper line (see
  [`concept_ui/Frame 1321316786.png`](concept_ui/Frame%201321316786.png)).
- **Typography:** a Bangla-capable font matching the mockups; ensure Bangla numerals render.
- **Dark/light:** provide both; test every screen in both. Accent/status colors must remain legible
  in dark mode.
- **Responsive & PWA:** desktop dashboards + **mobile layouts for FWA** field entry (the small-width
  frames such as [`concept_ui/Frame 1171277058.png`](concept_ui/Frame%201171277058.png) and
  [`concept_ui/Frame 1321316805.png`](concept_ui/Frame%201321316805.png) show the compact/stacked
  forms and tables). Wide tables scroll horizontally inside their container. The **FWA field
  experience is delivered as an installable PWA** (offline queue + background sync + GPS + camera) —
  see §1.1(2) and §11.

**Build a design-token layer and a shared component library first**, so every module composes the
same nav, cards, tables, pills, forms, steppers, timelines, and dialogs.

---

## 7. Public Site (per subdomain, unauthenticated)

- **Landing page:** graphical overview of what Suraha does and its features; the public-awareness
  **image sliders** (managed in the Slider module); prominent CTAs → **schedule/appointment request**,
  **file a complaint**; and **Login** / **Register** links.
- **Citizen registration & login:** register with a **mobile number**, verified by **OTP/SMS**.
  Minimal profile. **Registration + login is required before filing a complaint or booking an
  appointment** (§1.1(6)) — no anonymous submissions; submissions are tied to the citizen's account.
- **Place an appointment (schedule request):** authenticated form to request a UNO appointment (fields
  per the appointment module, §8.3) — see the appointment detail form
  [`concept_ui/Frame 1171277083.png`](concept_ui/Frame%201171277083.png).
- **File a complaint:** authenticated form with complainant identity, union/ward, **live location**,
  address, title, date/time, attachment (photo/PDF), and detailed description — see
  [`concept_ui/Frame 1171277082.png`](concept_ui/Frame%201171277082.png).
- **Track:** since notifications are in-app only (§1.1(4)), citizens **log in and track** their
  complaint/appointment status via the same lifecycle timeline officials see (read-only), and see the
  in-app bell for updates.
- **Public info:** important phone numbers and about-the-upazila content (from General Info, §8.6).

---

## 8. Modules

For each module below: reproduce the referenced screens, implement the listed data model and
workflow/state machine, enforce the role actions, emit the notifications, and meet the acceptance
criteria.

### 8.1 প্রসূতি কল্যাণ — Pregnant-Mother Welfare (Prositi Kollan) **[connected → Birth Registration]**

**Purpose:** track pregnant mothers through pregnancy stages, deliver stage-appropriate services,
confirm delivery, and hand off to birth registration.

**Screens:**
- **List — প্রসূতি তালিকা** ([`concept_ui/Frame 1171277088.png`](concept_ui/Frame%201171277088.png),
  [`concept_ui/Frame 1171277070.png`](concept_ui/Frame%201171277070.png)): tabs **সকল তালিকা /
  ডেলিভারী হয়নি / ডেলিভারী হয়েছে** with counts and "N new" badges; columns আইডি, নাম, স্বামীর নাম,
  ওয়ার্ড নং, ইউনিয়ন, মোবাইল নাম্বার, ডেলিভারি অবস্থা, সম্ভাব্য ডেলিভারি; search/filter; **+ নতুন
  যুক্ত করুন**; kebab row menu; empty state.
- **Add — নতুন প্রসূতি তথ্য যুক্ত করুন** (multi-step, right-rail stepper
  [`concept_ui/Frame 1171277053.png`](concept_ui/Frame%201171277053.png),
  [`concept_ui/Frame 1321316805.png`](concept_ui/Frame%201321316805.png)): steps **সাধারণ তথ্য →
  ঠিকানা ও যোগাযোগ → স্বাস্থ্য সংক্রান্ত তথ্য → ডেলিভারি সংক্রান্ত তথ্য**, "পরবর্তী" to advance.
- **Detail** (tabbed + right panel [`concept_ui/Frame 1171277076.png`](concept_ui/Frame%201171277076.png),
  [`concept_ui/Frame 1321316806.png`](concept_ui/Frame%201321316806.png)): right panel shows subject
  summary + **delivery-status dropdown** (ডেলিভারী অবস্থা); when set to **ডেলিভারি হয়েছে**, reveal
  the red **"জন্ম নিবন্ধন তৈরি করুন"** action. Location field has **ট্র্যাক করুন** (GPS live location).

**Data model (from the detail form — capture all of it so birth registration needs no re-entry):**
- *General:* mother's name (Bangla) `প্রসূতি মায়ের নাম (বাংলাতে)`, name (English), husband's name,
  register no, which-child (কততম সন্তান), height (inch), weight (kg), current age, marriage age,
  blood group, chronic diseases (দীর্ঘমেয়াদি রোগ, multi).
- *Address & contact:* union/pourashava, ward no, address, **current location (lat,long) + track**,
  mobile number.
- *Health:* TT-vaccine count, last TT date, last menstruation date, gravida count, prior
  miscarriages, last child's age, prior normal deliveries, prior C-section deliveries, prior
  delivery place.
- *Delivery:* expected delivery date, where she will deliver, emergency transport available, enough
  money for transport, blood donor arranged, then post-delivery: actual delivery date, mother's
  status (alive), delivery type, delivery place, newborn count, newborn status, **sex (ছেলে/মেয়ে)**,
  birth weight, birth height, birth time.

**Workflow / state machine:**
1. **FWA** captures mother's full detail from the household on **mobile** → record created
   (`ডেলিভারী হয়নি`).
2. Record appears on the **Sochib** dashboard; mother receives stage-appropriate services as
   pregnancy progresses.
3. On delivery, **FWA confirms delivery** (sets ডেলিভারি হয়েছে + delivery fields).
4. Flows to **Sochib**, who **approves**; approval **auto-places a birth-registration request to the
   BDRIS API** (all required fields already collected in steps 1–3).
5. On BDRIS success, a **system-generated birth certificate** is produced and made available to the
   parents. This creates/links the birth-registration record (§8.2).

**Role actions:** FWA create/edit own-area records, confirm delivery. Sochib review/approve, trigger
BDRIS. DC/SEAL view. **Notifications:** new mother added, delivery confirmed (→ Sochib), approval &
BDRIS result, certificate ready (→ parents/Sochib).

**Acceptance:** matches the list/add/detail frames; stepper works; delivery-status change reveals the
birth-registration action; GPS track works; approval calls BDRIS with pre-collected data and yields a
certificate; all in Bangla, both themes.

### 8.2 জন্ম নিবন্ধন — Birth Registration **[connected ← Pregnancy]**

**Purpose:** manage birth-registration entries and BDRIS-issued certificates.

**Screens — জন্মনিবন্ধন তালিকা** ([`concept_ui/Frame 1171277048.png`](concept_ui/Frame%201171277048.png)):
tabs **সকল তালিকা / কার্যকর কিন্তু এন্ট্রি হয়নি / কার্যকর তালিকা** with counts + "N new"; columns
আইডি, জন্মনিবন্ধন নাম্বার, সন্তানের নাম, মায়ের নাম, পিতার নাম, ইউনিয়ন, ওয়ার্ড নং, বর্তমান অবস্থা
(**এন্ট্রি হয়নি** = amber / **এন্ট্রি হয়েছে** = green); search/filter; + নতুন যুক্ত করুন; kebab menu.

**Data model:** birth-registration no (BDRIS), child name, mother name, father name, union, ward,
DOB, sex, link to the source pregnancy record, certificate PDF, status.

**Workflow:** normally created automatically from an approved delivery (§8.1) via BDRIS; also allow
manual entry. Dashboard "জন্ম সনদ" summary card tracks today's new certs, total certs, and "কার্যকর
কিন্তু এন্ট্রি হয়নি".

**Role actions:** Sochib manage; SEAL/DC view. **Notifications:** certificate issued, entries pending.

**Acceptance:** list + tabs + pills match; certificate downloadable; auto-created records from
pregnancy approval appear here.

### 8.3 সাক্ষাৎকার — Appointment (UNO)

**Purpose:** citizens request appointments with the UNO; UNO manages them.

**Screens:**
- **List — সাক্ষাৎকার** ([`concept_ui/Frame 1171277087.png` list variant]) — see
  [`concept_ui/Frame 1171277088.png`](concept_ui/Frame%201171277088.png) pattern and the appointment
  list frame: tabs **সকল সাক্ষাৎকার / অপেক্ষমান / অনুমোদিত / নাকচ** with counts + "N new"; columns
  আইডি, তারিখ, সময়, সাক্ষাতের কারন, বিবরণ, বর্তমান অবস্থা; kebab menu.
- **Detail / form — সাক্ষাৎকার**
  ([`concept_ui/Frame 1171277083.png`](concept_ui/Frame%201171277083.png)): sections **সাক্ষাত
  প্রার্থীর পরিচয়** (name, union/pourashava, ward, address, mobile) and **সাক্ষাৎকার আবেদন**
  (সাক্ষাতের ধরণ, বিস্তারিত বিবরণ). Right panel: current status + **নাকচ করুন / অনুমোদিত করুন** and
  **নতুন তারিখ ও সময় নির্ধারণ করুন** (reschedule).

**Workflow / states:** অপেক্ষমান → অনুমোদিত | নাকচ | (rescheduled). **Role actions:** public create;
UNO approve/reject/reschedule; DC/SEAL view. **Notifications:** new request (→ UNO), decision
(→ citizen).

**Acceptance:** list tabs + detail + right-panel actions match; citizen can create from the public
site and track status.

### 8.4 অভিযোগ — Complaint **[standalone, with investigator sub-dashboards]**

**Purpose:** citizens file complaints; UNO schedules and assigns investigating officers; officers
report findings; UNO resolves.

**Screens:**
- **List — অভিযোগ** ([`concept_ui/Frame 1171277087.png`](concept_ui/Frame%201171277087.png)):
  lifecycle tabs **সকল অভিযোগ / নিষ্পত্তিহীন / শিডিউল যুক্ত / তদন্ত কর্মকর্তা যুক্ত / নিষ্পত্তি সম্পন্ন**
  with counts + "N new"; columns শিরোনাম, অভিযোগের তারিখ, সময়, অভিযোগকারী, ঘটনাস্থল (+ **ট্র্যাক করুন**
  live location), বর্তমান অবস্থা (status pill), শিডিউল, তদন্তকারী কর্মকর্তা; kebab menu.
- **Detail** ([`concept_ui/Frame 1171277082.png`](concept_ui/Frame%201171277082.png) →
  [`concept_ui/Frame 1321316786.png`](concept_ui/Frame%201321316786.png)): **অভিযোগকারীর পরিচয়**
  (name, union, ward, live location, address, mobile), **অভিযোগের বিস্তারিত** (title, date, time,
  photo/PDF attach + download, description), and **নিষ্পত্তির বিস্তারিত** (investigating officer +
  findings + attachment). Right panel: **vertical status timeline** — **অভিযোগ দাখিল → শিডিউল যুক্ত →
  তদন্তকারী যুক্ত → নিষ্পত্তি** with timestamps — plus stage actions **শিডিউলযুক্ত করুন / তদন্তকারী
  নিযুক্ত করুন / নতুন শিডিউল যুক্ত করুন / নাকচ করুন**.
- **Investigating-officer dashboard:** each officer sees complaints assigned to them and submits
  their report/findings (which populate নিষ্পত্তির বিস্তারিত).
- **কর্মকর্তা তালিকা** sub-page under অভিযোগ for managing which officers can investigate.

**Workflow / states:** দাখিল → শিডিউল → তদন্তকারী নিযুক্ত → (officer submits findings) → UNO marks
**নিষ্পত্তি (resolved) / pending**. Track full history with timestamps.

**Role actions:** public file + track; UNO schedule/assign/update status/resolve; investigating
officer submit findings; DC/SEAL view. **Notifications:** new complaint (→ UNO), assigned
(→ officer), findings submitted (→ UNO), status change/resolved (→ citizen).

**Acceptance:** all lifecycle tabs, the timeline with timestamps, investigator assignment + findings,
live-location tracking, and attachment download all match; citizen tracking works from the public site.

### 8.5 ইমেজ স্লাইডার — Image Sliders / Public Awareness

**Purpose:** manage the public-awareness carousel shown on the landing page and surfaced on the
dashboard.

**Screens** ([`concept_ui/Frame 1321316780.png`](concept_ui/Frame%201321316780.png), dashboard card
in [`concept_ui/Dashboard.png`](concept_ui/Dashboard.png)): large preview + list of slides with
thumbnail, title, date, **status (চলমান / বন্ধ আছে)**, "বিস্তারিত লিংক / Go to", kebab menu, and
**+ নতুন যুক্ত করুন**.

**Data model:** image, title, external link, date, active/stopped status. **Role actions:** SEAL/UNO
manage; public sees on landing + dashboard card. **Acceptance:** create/activate/stop slides;
carousel renders on landing page and dashboard.

### 8.6 কর্মকর্তা — Officers, and সাধারণ তথ্য — General Info

- **Officers (কর্মকর্তা → পদবী / কর্মকর্তা তালিকা):** manage designations and officer accounts
  (create, assign role + designation + union/ward scope). The dashboard "কর্মকর্তা" card summarizes
  totals (মোট স্বাস্থ্যকর্মী, মোট পরিবার পরিকল্পনা কর্মী, মোট ইউপি সচিব).
- **General Info (সাধারণ তথ্য → প্রয়োজনীয় ফোন নাম্বার / উপজেলা সম্পর্কিত):** editable public info —
  important phone numbers and about-the-upazila content, surfaced on the public site. The `+` in the
  sidebar section header adds new general-info items.

### 8.7 রিপোর্ট — Reporting & Analytics **[per §1.1(7)]**

**Purpose:** operational reports for officers plus aggregate analytics for oversight.

**Two levels:**
1. **Per-module operational reports** (e.g. the রিপোর্ট sub-page under প্রসূতি কল্যাণ, extended to birth
   registration, complaints, and appointments): filterable by **date range, union, ward, and status**,
   rendered as tables + summary charts, and **exportable to PDF and Excel**. Scoped to the officer's
   upazila.
2. **Oversight analytics (DC & SEAL):**
   - **DC** — read-only aggregate analytics **across their district's upazilas** with upazila
     comparison, trends, and charts (no drill-down actions).
   - **SEAL** — read-only aggregate analytics **across all upazilas/districts**, plus the ability to
     switch into any single upazila's reports.
   - Metrics to surface: pregnancies (new/total/delivered), deliveries, birth certificates
     (issued / pending entry), complaints (filed/scheduled/assigned/resolved + resolution time),
     appointments (requested/approved/rejected), and officer counts — mirroring the dashboard stat
     cards but time-series and cross-tenant.

**Design:** reuse the card + table + status-pill system; add charts consistent with the design system
(theme-aware, legible in dark + light). **Role actions:** officers view/export their upazila; DC views
district (read-only); SEAL views all. **Acceptance:** filters + PDF/Excel export work; DC/SEAL rollups
respect read-only + scope; charts render in both themes; all labels in Bangla.

---

## 9. Cross-Cutting Concerns

- **Auth & sessions:** internal **officers log in with admin-created username/password**; **citizens
  with mobile + SMS OTP**. No NID/SSO (§1.1(3)). Role- and tenant-aware sessions; secure password
  reset. Officer accounts are provisioned via the officer-management area (§8.6).
- **Profile management:** profile page with **avatar/profile-image upload**, **password change**,
  name, **designation**, contact. (Top-bar avatar shows name + role.)
- **Notification system — in-app only:** the **only** channel is in-app (top-bar bell + sidebar
  "N new" badges), per §1.1(4). It surfaces **new and pending important items** per role — e.g. new
  mother/delivery/approval, new appointment, new/assigned complaint, findings submitted, certificate
  ready. **No SMS/email/push** for status updates; citizens rely on the bell + logging in to track.
- **Internationalization:** **Bangla-only UI** (no language toggle, §1.1(5)) with Bangla numerals;
  English is captured only in the specific data fields that ask for it (names). Still centralize
  strings so copy is maintainable.
- **Theming:** light + dark, user-toggleable, respected across all modules.
- **Audit logging:** record who changed what and when for every state transition (deliveries,
  approvals, complaint status, appointment decisions) — important for a govt system.
- **Error & bug logging / monitoring:** structured application logs, centralized error tracking, and
  a **bug-fixing mechanism** (issue capture + traceability). Surface failures (e.g. BDRIS API errors)
  to the right operator with retry.

---

## 10. Integrations

- **BDRIS API (Birth & Death Registration Information System) — real integration (§1.1(1)):** on
  delivery approval, automatically submit a birth-registration request using the already-collected
  field data; store the returned registration number and generate/store the **birth certificate PDF**.
  Handle auth, validation errors, **retries, and idempotency**. Treat the exact BDRIS endpoint/
  credentials as **configuration**, behind a **swappable adapter** so a mock can stand in during
  development until SEAL's official access is granted.
- **SMS / OTP gateway — OTP only (§1.1(3–4)):** used **solely** to deliver citizen login/registration
  OTPs. It is **not** used for status notifications (those are in-app only). Configurable provider
  behind an interface.
- **Maps / GPS:** capture and display **live location (lat,long)** with a "ট্র্যাক করুন" action for
  mothers' current location and complaint incident locations.
- **File & PDF storage:** attachments (complaint/appointment photos & PDFs) and generated birth
  certificates. Tenant-scoped storage.
- **Certificate generation:** render the system-generated birth certificate as a downloadable PDF.

Keep every integration behind an interface with per-tenant configuration so a self-hosted upazila can
supply its own credentials.

---

## 11. Non-Functional Requirements

- **Security & privacy:** this holds sensitive PII (pregnant mothers' health, citizens' complaints).
  Encrypt in transit and at rest, least-privilege RBAC, tenant isolation, input validation, audit
  trails, and safe file handling. DC read-only must be enforced server-side.
- **Performance:** dashboards and lists must stay responsive with thousands of records per upazila
  (paginate/virtualize large tables; the mockups show 1,236+ mothers).
- **Offline (FWA PWA — §1.1(2)):** the FWA field client is an **installable PWA** that must work
  offline — capture and **queue field entries locally** and **background-sync** when connectivity
  returns, with clear per-record sync status and conflict handling. Uses **GPS + camera**. A service
  worker caches the app shell.
- **Reliability & backups:** regular backups; safe migrations; graceful handling of BDRIS/SMS outages.
- **Observability:** logs, metrics, and error tracking (ties to §9 bug mechanism).
- **Accessibility:** sufficient color contrast in both themes, keyboard navigation, adequate touch
  targets on mobile.
- **Deployability:** containerized, config-driven, so SEAL can host centrally now and split a single
  upazila out to self-host later.

---

## 12. Technology Specification (committed stack)

Build on this stack — it is a decided constraint, not a menu.

### 12.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| **Backend** | **Laravel 11 (PHP 8.3+)** | REST/JSON API. |
| **API auth** | **Laravel Sanctum** | Officer credential login + citizen mobile-OTP sessions/tokens; role- and tenant-aware. |
| **Multi-tenancy** | **`stancl/tenancy`**, subdomain-based | Tenant = upazila resolved from `{upazila}.suraha.com.bd`. Start with a **single central PostgreSQL** and **upazila scoping via global scopes**; structure models/migrations so one tenant can be **exported to its own database** for self-host later (stancl supports multi-DB — keep the boundary clean). |
| **Frontend** | **React (Vite) + MUI (Material Design 3)** | Reproduce the concept_ui/Figma design with MUI theming. Consumes the Laravel API. *(Alternative if tighter Laravel coupling is wanted: Inertia.js + React.)* |
| **i18n / theme** | **react-i18next (`bn` only)** + MUI light/dark theme | Bangla-only UI (§1.1(5)), Bangla numerals; English only in specific data fields. |
| **FWA PWA** | Service worker (**Workbox**) + **IndexedDB** offline queue + **Background Sync** | Installable; offline capture + sync; GPS + camera via web APIs (§1.1(2)). |
| **Database** | **PostgreSQL 16** | Strong for tenant scoping, JSON, and reporting/analytics. |
| **Cache / queue** | **Redis** + **Laravel Queue + Horizon** | Async, retryable jobs: BDRIS submit, OTP SMS, in-app notifications, PDF generation, PWA-sync processing. **Laravel Scheduler** for periodic tasks. |
| **Object storage** | **S3-compatible** via Laravel filesystem | **MinIO** for self-host / AWS S3 centrally — attachments + generated certificates. |
| **PDF** | dompdf or wkhtmltopdf/Snappy | System-generated birth-certificate PDFs. |
| **Maps / GPS** | **Leaflet + OpenStreetMap** | Live-location capture/display ("ট্র্যাক করুন"). |
| **Integrations** | Behind swappable adapters | **BDRIS** (real, mockable — §1.1(1)); **SMS gateway** used for **OTP only** (§1.1(3–4)). |
| **Observability** | Laravel logging + error tracking (**Sentry** or self-host **GlitchTip**); audit trail via **`owen-it/laravel-auditing`** | Covers §9 audit + bug-logging requirements. |

### 12.2 Deployment topology

- **Docker Compose on a single Linux VPS/server.** Services: **app** (PHP-FPM + Nginx), **postgres**,
  **redis**, **queue worker** (Horizon), **scheduler**, and **minio** (optional / self-host).
- **Reverse proxy** (Nginx, Caddy, or Traefik) terminating **wildcard TLS for `*.suraha.com.bd`**
  (Let's Encrypt **DNS-01** challenge, since the cert is wildcard). Also handle `*.suraha.gov.bd` if used.
- **Config & secrets via environment** (`.env`); per-tenant integration credentials (BDRIS, SMS, S3)
  are configuration.
- **Self-host variant:** document a single-upazila compose stack (its own PostgreSQL DB + one
  subdomain), producible from the same images with config only.

### 12.3 Engineering practices (recommended)

Not mandated, but strongly advised:
- **Monorepo** layout: `api/` (Laravel) + `web/` (React PWA) + shared config; coordinated development.
- **CI/CD** (e.g. GitHub Actions): lint → test → build → deploy, with **staging** and **production**.
- **Automated tests** — prioritize **RBAC enforcement, tenant scoping, the BDRIS adapter, and the
  pregnancy → approval → certificate flow**; these are the highest-risk paths for a govt system.

---

## 13. Build Sequence / Milestones

0. **Scaffold (stack §12):** Laravel 11 API + React/MUI PWA (monorepo), PostgreSQL, Redis + Horizon,
   S3-compatible storage, Sanctum auth, `stancl/tenancy`, Docker Compose + wildcard-TLS reverse proxy.
1. **Foundation:** design tokens + shared **MUI** component library (nav, top bar, cards, tables,
   pills, forms, stepper, timeline, dialogs, empty states) in light + dark, Bangla. Reproduce the
   shell from the Dashboard/Layout/Side-Navigation frames.
2. **Auth & multi-tenancy:** subdomain tenant resolution (`stancl/tenancy`), roles, RBAC, Sanctum
   sessions, officer accounts, profile management.
3. **Dashboard shell:** per-role dashboards; SEAL all-upazila aggregate + upazila switcher; DC
   read-only district switcher.
4. **Pregnancy module + BDRIS:** list/add(stepper)/detail, **FWA PWA** field capture (offline queue +
   sync + GPS/camera), delivery confirm, Sochib approve → **BDRIS birth registration** (real adapter,
   mockable) → certificate; then the Birth Registration module.
5. **Complaints:** list lifecycle tabs, detail timeline, investigator assignment + investigator
   dashboards + findings, status/resolve.
6. **Appointments:** list + detail + approve/reject/reschedule.
7. **Public site:** landing page (features + sliders + CTAs), citizen register/login (OTP),
   **account-required** appointment/complaint placing + tracking, public info.
8. **Image sliders & general info** management.
9. **Reporting & analytics** (per-module exports + DC/SEAL rollups, §8.7).
10. **In-app notifications, audit logging, bug/error mechanism, polish**, and full light/dark +
    Bangla QA.

Verify each milestone against the relevant `concept_ui/` frames before proceeding.

---

## 14. Definition of Done (global checklist)

- [ ] Every screen matches its `concept_ui/` reference (and Figma) — no invented UI.
- [ ] Entire UI in **Bangla** (with Bangla numerals); dual-language capture only where data needs it.
- [ ] **Light and dark** themes work on every screen.
- [ ] **RBAC + tenant scoping** enforced server-side; DC is read-only; SEAL is cross-tenant;
      subdomain resolves the correct upazila.
- [ ] All listed **modules** implemented with their workflows, especially the **pregnancy → Sochib
      approve → BDRIS → birth certificate** chain and the **complaint lifecycle timeline** with
      investigator findings.
- [ ] **Public site** (landing, register/OTP, appointment, complaint, tracking) works per subdomain,
      with **filing gated behind a citizen account** (no anonymous submissions).
- [ ] **FWA field client is an installable PWA** that captures data offline and background-syncs.
- [ ] **Reporting & analytics**: per-module PDF/Excel exports work; DC/SEAL rollups respect scope +
      read-only; charts render in both themes.
- [ ] **Notifications are in-app only** (bell + "N new"); SMS is used **only** for login OTP.
- [ ] Profile management (image upload, password change, designation), audit logging, and error/bug
      logging are in place.
- [ ] Integrations (BDRIS real+mockable, SMS-OTP-only, maps/GPS, file/PDF storage, certificate PDF)
      are config-driven, behind swappable adapters, and handle failures gracefully.
- [ ] Architecture supports **exporting a single upazila to self-host** later with configuration only.
- [ ] Built on the **committed stack (§12):** Laravel 11 API + Sanctum + `stancl/tenancy`, React/MUI
      PWA, PostgreSQL 16, Redis + Horizon, S3-compatible storage, deployed via Docker Compose behind a
      **wildcard-TLS (`*.suraha.com.bd`)** reverse proxy.

---

### Design reference index (`concept_ui/`)

- Shell / nav: `Dashboard.png`, `Dashboard-2.png`, `Layout.png`, `Side Navigations.png`,
  `Top bar.png`, `Navigation Drawer.png`, `Navigation Drawer-2.png`, `Navigation Drawer-3.png`,
  `Aside-2.png`.
- Dashboard cards: `Frame 1171277045.png`, `Frame 1171277046.png`.
- Pregnancy: `Frame 1171277070.png` (list), `Frame 1171277088.png` (list),
  `Frame 1171277053.png` (add/stepper), `Frame 1321316805.png` (add, mobile),
  `Frame 1171277076.png` (detail), `Frame 1321316806.png` (detail, delivered),
  `Frame 1171277058.png` (compact list).
- Birth registration: `Frame 1171277048.png`.
- Appointment: `Frame 1171277083.png`.
- Complaint: `Frame 1171277087.png` (list), `Frame 1171277082.png` (detail),
  `Frame 1321316786.png` (detail, resolved + timeline + empty state).
- Sliders: `Frame 1321316780.png`.
- Components: `Basic dialog.png`, `Text field.png`.
- Figma (authoritative): https://www.figma.com/design/eywg5k7XOILjdYc7Gzarqm/Suraha-app
