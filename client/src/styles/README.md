🎨 CSS Architecture & Ownership Guide
Security Company Management System

Frontend Styling Reference

This document explains where each CSS file is used, what it owns, and what it must NOT style.

The goal is to:

Avoid accidental cross-page styling

Make maintenance safe

Prevent color/theme conflicts

Keep the UI production-stable

🧱 Core Principle

One CSS file = one responsibility

No file should “kind of” style multiple features.

If a style is shared, it must be:

Explicitly named

Explicitly imported

Role-neutral

📁 CSS FILE MAP
1️⃣ supervisor.css

Purpose:
Layout, navigation, dashboard, and sidebar styling
(Used by Guard, Supervisor, Owner layouts)

Owns:

.layout

.sidebar, .sidebar-header

.brand-*

.nav, .nav-link

.main-content

Dashboard cards & metrics

Sidebar logout button

Does NOT own:

Schedule UI

Forms

Modals

Buttons (except sidebar logout)

Alerts / feedback

📌 This file defines the application shell, not page content.

2️⃣ schedule.css

Purpose:
All schedule & pay-period visual structure
(Shared by Guard & Supervisor)

Owns:

.schedule-wrapper

.schedule-title

.schedule-subtitle

.day-card, .day-title

.shift-row

.time-badge

.guard-name

.no-shifts

Imported by:

SharedScheduleView.jsx

GuardPayPeriods.jsx

SupervisorPayPeriods.jsx

Does NOT own:

Buttons

Forms

Modals

Alerts

📌 This file is the single source of truth for schedule UI.

3️⃣ addShift.css

Purpose:
Add-Shift form styling only

Owns:

Add Shift form card

Labels

Inputs & selects

Green primary action button (Add Shift context only)

Owns (scoped):

.schedule-wrapper form

.schedule-wrapper label

.schedule-wrapper input, select

.schedule-wrapper .btn-primary (green variant)

Does NOT own:

Schedule titles

Schedule cards

Modals

Alerts

Secondary/Danger buttons

📌 This file must never style shared schedule visuals.

4️⃣ ui-feedback.css

Purpose:
Global user feedback & modal UI
(Role-neutral, shared)

Owns:

.modal-backdrop

.modal

.modal-actions

.error-text

.success-text

.info-text

Imported by:

Pay Period pages

Add Shift

Any component using modals or alerts

📌 This file exists to eliminate mystery modal styling.

5️⃣ ui-buttons.css

Purpose:
Shared non-primary buttons

Owns:

.btn-secondary

.btn-danger

Imported by:

Pay Period pages

Schedule pages

Modals

Does NOT own:

.btn-primary (context-specific)

📌 Button styles are now intentional, not accidental.

6️⃣ scheduleAnnouncements.css

Purpose:
Announcements page only

Owns:

.schedule-container

.schedule-card

.schedule-meta

.schedule-input

.primary-btn (announcements only)

Scoped to:

.main-content .schedule-container


📌 This file is fully isolated and safe.

🚫 Rules Going Forward (Very Important)
❌ DO NOT:

Add schedule styles to addShift.css

Add modal styles to feature CSS files

Define buttons without documenting ownership

Rely on CSS load order for visuals

Use !important to fight another file

✅ DO:

Create a new CSS file if responsibility changes

Import shared CSS explicitly in JSX

Keep selectors unchanged unless refactoring intentionally

Update this README if ownership changes