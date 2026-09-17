# Product Requirements Document (PRD): MediBridge Clinical Operations Platform

**Document Version:** 1.0.0  
**Product Name:** MediBridge  
**Category:** Healthcare Coordination & Clinical Operations SaaS  
**Target Form Factor:** Desktop-first Web Application  
**Primary Design System:** Clinical Coordination & Operations (Light Theme, Inter, Royal Blue `#004ac6` / `#2563eb`, Clean Slate Neutrals)  
**Security & Compliance:** HIPAA compliant, SOC-2 ready, Zero-Knowledge cryptographic hashing (SHA-256 for recovery questions)

---

## 1. Executive Summary & Vision

**MediBridge** is a modern, unified clinical coordination platform designed to bridge the operational gap between Healthcare Institutes, Doctors/Clinicians, Receptionists/Intake Staff, and Patients. 

Unlike bloated legacy Electronic Health Record (EHR) systems encumbered by clunky diagnostic coding and superfluous modules, MediBridge delivers a streamlined, role-specific, high-efficiency workflow focused strictly on:
1. **Multi-Clinic Network Governance & Staff Onboarding/Offboarding** (Institute Admin)
2. **Clinical Appointment Triage, Review & Availability Scheduling** (Receptionist)
3. **Daily Patient Queue, Calendar/Gantt Schedule & Privacy-Preserving Document Requests** (Doctor)
4. **Care Journey Timelines, Document Vault & Explicit Access Consent Control** (Patient)
5. **Secure, Zero-Leakage Authentication & 3-Question Cryptographic Recovery**

---

## 2. Core Personas & Role-Based Access Control (RBAC)

| Role | Target User | Key Responsibilities & Permissions | In-Scope Boundaries |
| :--- | :--- | :--- | :--- |
| **Institute Administrator** | Medical Director / Regional Operations Lead | Manages affiliated clinics, onboards/deboards staff, oversees aggregate clinic patient volume trends. | **Single Admin model**: No public self-registration. Access via dedicated admin sign-in portal. Cannot modify clinical patient notes. |
| **Doctor / Clinician** | Attending Physicians, Specialists | Views daily/weekly/monthly appointment schedule, opens patient records, logs consultation visit notes, issues document requests. | **Cannot view patient vault contents without explicit consent**. Can only send generalized requests/instructions to patients. No raw vitals/ICD-10 billing clutter. |
| **Receptionist / Desk** | Clinic Receptionist, Intake Coordinator | Reviews patient appointment requests, assigns slots against doctor availability, schedules new visits, manages daily intake queue. | Strictly operational scheduling and triage. No clinical record modification rights. |
| **Patient** | Enrolled Patient / Care Recipient | Views care timeline/Gantt chart of visits, submits appointment requests, manages uploaded documents in a private vault, grants/revokes doctor access. | Strict ownership of health data. Has granular control over which specific documents a requesting physician can access and for how long. |

---

## 3. Global Design System & UX Standards

* **Typography:** Inter (Modern geometric grotesque sans-serif with high legibility across clinical density).
* **Color Palette:**
  * Primary Brand / Accent: Medical Royal Blue (`#004ac6` / `#2563eb`)
  * Surface Background: Soft clinical porcelain (`#f8f9ff`)
  * Elevated Containers: Clean white (`#ffffff`) with subtle 1px border (`#e2e8f0` / `#eff4ff`)
  * Success / Active: Forest Green (`#16a34a` / `#10b981`)
  * Warning / Pending: Warm Amber (`#d97706`)
  * Danger / Revoke: Soft Crimson (`#dc2626`)
* **Layout Principles:**
  * **No generic sidebars:** Standardized, distraction-free top navigation featuring the unified brand mark (`MediBridge`) on the left and active User Profile / Settings trigger on the right.
  * **Bento Architecture:** Balanced, cohesive desktop grids designed to present actionable data without visual crowding or extraneous scrolls.
  * **Scoped Simplicity:** Zero out-of-scope fields (e.g. no medical licensing numbers, ICD-10 diagnostic billing, raw vitals tables, or medication dispensing).

---

## 4. Feature Specifications by Workflow

### 4.1. Authentication & Security Architecture

#### 4.1.1. Full-Screen Split Visual Authentication
* **Split Layout:** Left pane features high-resolution architectural healthcare imagery that dynamically updates based on the selected role (Doctor, Patient, Receptionist); right pane contains form interactions.
* **Streamlined Registration (Step 1):** Simple registration requiring only Full Name, Official Email, and Password. Admin self-registration is explicitly prohibited.
* **3 Security Questions Setup (Step 2):** Mandatory secondary setup post-registration. The user selects 3 distinct questions from curated pools (e.g. elementary school, first clinical role, favorite teacher) and provides answers.
* **Cryptographic Storage:** Answers are hashed with SHA-256 and salted. No plain-text storage.
* **Account Recovery Flow:**
  * Users identify their account via registered email.
  * Step 1: Answer the 3 pre-configured security questions (case-insensitive hash match; 3 failed attempts triggers lock).
  * Step 2: Set new password with live strength verification (8+ chars, uppercase, digit, special symbol) and session termination toggle.
* **Admin Access Portal:** Accessible only via a dedicated, subtle hyperlink at the bottom of the sign-in card (*"Institute Administrator? Sign in here →"*).

---

### 4.2. Institute Management (Admin Portal)

#### 4.2.1. Clinical Operations Command Center
* **Key Performance Indicators (KPIs):** Total Enrolled Clinics, Active Facilities, Total Staff Roster, and Aggregate Patient Volume.
* **Patient Volume Trends Graph:** Clean line graph tracking monthly/quarterly clinic-wide patient throughput (no department breakdowns).
* **Enrolled Clinics Quick Directory:** Card view linking to the master clinics directory.
* **Staff Governance Table:** Displays staff name, assigned clinic facility, role/specialty, onboarding date, and real-time status toggle (Active / On Leave / Inactive).

#### 4.2.2. Multi-Clinic Management
* **Clinic Directory:** Lists all affiliated facilities, active clinical units, designated administrative leads, and clinical staff headcounts.
* **Enroll New Clinic Modal:** Clean, focused modal capturing Clinic Name, Medical Specialty/Focus, Lead Administrator Email, Contact Phone, and Operational Capacity.

#### 4.2.3. Staff Onboarding & Deboarding
* **Onboard Staff Modal:** Assigns full legal name, institutional email, designated enrolled clinic, and role designation. Automatically provisions role credentials.
* **Deboard / Offboard Staff Modal:** Dedicated security confirmation modal requiring reassignment of open consultations and immediate revocation of institutional credentials.

---

### 4.3. Doctor Workspace & Clinical Scheduling

#### 4.3.1. Clinical Bento Dashboard
* **Doctor Top Navigation:** Brand logo on the left, Doctor profile menu on the right.
* **Today's Patient Roster:** List of scheduled appointments with patient name, MRN, visit type, time slot, and a direct `Open Record` action. Clean pagination and status filters.
* **Today's Schedule / Daily Gantt Timeline:** Visual chronological timeline of visits throughout the day, featuring a direct hyperlink to open the full calendar schedule.

#### 4.3.2. Master Calendar & Gantt Views
* **Weekly Gantt & Queue:** 5-day / weekly Gantt view mapping active consult slots and breaks alongside a "Next Up" queue.
* **Monthly Calendar View:** Full-month operational grid displaying patient appointments by date with easy month switcher and date indicators.
* **Set Availability Modal:** Interactive pop-up allowing doctors to define weekly working hours, active shift blocks, and lunch/break buffers.

#### 4.3.3. Patient Clinical Record & Document Request
* **Patient Record View:** Focuses cleanly on medical history, past consultations, allergies/alerts, and upcoming scheduled visits.
* **Privacy-Preserving Document Requests:** Doctors **cannot** browse a patient's unshared vault. Instead, doctors issue a structured request containing instructions/notes outlining what general documents are needed (e.g. *"Please share recent cardiology ECG traces or lipid panels from the past 6 months"*).

---

### 4.4. Receptionist Dashboard & Smart Triage

#### 4.4.1. Intake Command Center
* **Operational Summary:** Daily scheduled count, pending intake requests, and on-duty doctors.
* **Pending Appointment Requests Queue:** Table of patient-submitted appointment requests detailing patient name, preferred provider, requested window, and clinical visit reason.
* **Doctor Real-Time Availability Roster:** Quick reference of clinician status, on-duty hours, and next open appointment slot.

#### 4.4.2. Supporting Modals
* **Review & Schedule Request Modal:** Displays patient request details side-by-side with doctor slot availability for 1-click slot confirmation and automated patient dispatch.
* **Doctor Schedule & Availability Management Modal:** Allows receptionists to inspect any clinician's daily timetable to book or reschedule visits on demand.

---

### 4.5. Patient Health Hub & Digital Pass

#### 4.5.1. Health Hub Overview
* **Care Journey & Treatment Timeline (Gantt Chart):** Visual, interactive chronological timeline charting past consultations, active care plans, and upcoming follow-ups.
* **Upcoming Visit Card:** Highlights next appointment details with in-person/telehealth context and rescheduling controls.
* **Action CTAs:** Prominent `Request Appointment` and `Log Consultation / Record` triggers.

#### 4.5.2. Granular Document Vault & Consent Management
* **Private Document Vault:** Organized directory of patient health records, diagnostic PDFs, and lab reports with drag-and-drop upload functionality.
* **Consent Request Notification & Grant Access Modal:**
  * When a doctor requests records, the patient receives a notification displaying the doctor's custom message.
  * The patient opens the **Grant Access Modal**, selects specifically which files from their vault to share, configures the access duration (e.g., 30 Days, 90 Days, or Until Revoked), and authorizes access with full cryptographic audit logging.

---

## 5. Screen Inventory & Architecture Map

| ID | Title | Primary Role | Core Purpose |
| :--- | :--- | :--- | :--- |
| `SCREEN_8` | MediBridge — Authentication & Account Recovery | All / Public | Split-screen login & simple registration with dynamic photography. |
| `SCREEN_7` | Registration Step 2: Set Security Questions | All Roles | Enforces 3 recovery questions setup post-signup. |
| `SCREEN_5` | Forgot Password: 3 Security Questions Verification | All Roles | Verification checkpoint for password reset. |
| `SCREEN_6` | Forgot Password: Set New Password | All Roles | Credential update with strength meter and session revoke toggle. |
| `SCREEN_48` / `SCREEN_57` | Institute Management & Clinical Operations | Institute Admin | Executive bento dashboard, volume trendline, staff roster. |
| `SCREEN_36` / `SCREEN_90` | Enrolled Clinics & Facilities Directory | Institute Admin | Master list of healthcare centers and administrative leads. |
| `SCREEN_99` | Enroll New Clinic Modal | Institute Admin | Facility intake and operational provisioning modal. |
| `SCREEN_63` | Onboard Staff Modal | Institute Admin | Role-based credential generation and clinic assignment. |
| `SCREEN_94` | Deboard Staff Modal | Institute Admin | Staff credential revocation and patient reassignment. |
| `SCREEN_95` | Doctor Workspace — Clinical Bento Dashboard | Doctor | Single-screen bento with patient queue, daily timeline & metrics. |
| `SCREEN_86` | Doctor Schedule — Minimalist Weekly Gantt & Queue | Doctor | Weekly visual timeline with appointment status cards. |
| `SCREEN_49` | Doctor Schedule — Monthly Calendar View | Doctor | Month-at-a-glance scheduling grid. |
| `SCREEN_28` | Doctor Schedule — Set Availability Modal | Doctor | Shift duration and working hours configuration. |
| `SCREEN_91` / `SCREEN_83` | Patient Record — Marcus Chen | Doctor | Scoped clinical chart, visit note history, and document request CTA. |
| `SCREEN_73` | Doctor Document Request Modal & Tracker | Doctor | Instructs patient on required documents without exposing vault. |
| `SCREEN_64` | Receptionist Dashboard — Appointments & Availability | Receptionist | Intake queue, daily bookings, and clinician schedules. |
| `SCREEN_13` | Receptionist Review & Schedule Request Modal | Receptionist | Slot assignment modal for patient appointment requests. |
| `SCREEN_38` | Patient Health Hub — Care Timeline & Gantt Chart | Patient | Interactive care journey timeline and quick actions. |
| `SCREEN_52` | Patient Document Vault & Upload Experience | Patient | Secure record storage with drag-and-drop ingestion. |
| `SCREEN_85` | Patient Health Hub — Grant Access Modal | Patient | Granular consent manager responding to doctor requests. |
| `SCREEN_59` | Patient Health Hub — Request Appointment Modal | Patient | In-scope visit scheduling request form. |
| `SCREEN_92` | MediBridge — Public Landing Page (Minimalist) | Public | High-conversion, Awwwards-style architectural SaaS overview. |

---

## 6. Technical & Non-Functional Requirements

1. **Client-Side Responsiveness:** Optimized for 1440px+ desktop resolutions with clean scaling for laptop viewports (1280px).
2. **Security & Privacy by Design:** Zero plain-text security answers; SHA-256 client verification; zero doctor visibility into unconsented patient files.
3. **PWA & Deployment Assets Ready:** Manifest specification configured (`manifest.json`) alongside 1024x1024 vector-rendered application icons, favicons, and Apple Touch icons.
4. **Performance:** Sub-100ms UI interaction latency via modular Bento layouts, minimal DOM nesting, and native CSS transitions.
