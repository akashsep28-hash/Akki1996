# Nudge — Screen-by-Screen UX Specification

> Companion to `notification-task-app-prd.md`. Defines every screen and surface, its purpose, layout regions, components, states, interactions, and platform fallbacks. Built for direct design + developer handoff.

Conventions:
- **[CONFIRMED]/[REFINEMENT]/[PLATFORM-LIMITED]** carry the same meaning as in the PRD.
- "Surface" = notification, widget, or app screen. "Screen" = an in-app destination.
- Each screen lists: **Purpose → Regions → Components → States → Interactions → Fallbacks.**

Color tokens referenced throughout:
- `brand` = deep indigo (primary actions, "Set time").
- `timerAccent` = amber (secondary "Set timer," timer/effort UI) — the contrasting analytical accent.
- `success` = green (completion). `muted` = 40% opacity (faded/completed). `danger` = red (dismiss/delete).

---

## A. Surfaces (out-of-app)

### A1. Daytime check-in notification
- **Purpose:** The signature proactive ping — capture + triage without opening the app.
- **Regions:** Header (greeting + timestamp) · Inline add field · Task list (top N) · Footer (positive note).
- **Components:**
  - Greeting line: *"Hey — what's up? Anything to add?"*
  - Inline **reply/add** action (text input).
  - Per task row: title, due-time/timer chip, **Complete** (tick), **⋯ Manage** overflow.
  - **Snooze** action (header-level).
  - Positive note (one line, footer).
- **States:** collapsed (3 tasks) · expanded (5–6 + "+N more") · empty ("No open tasks — add one?") · post-action (row fades, list re-renders) · superseded (replaced by newer instance).
- **Interactions:** tap reply → keyboard inline → send → task created `captured`, then chips "Set time / Set timer / Later." Tap tick → `completed`, fade→collapse, undo affordance. Tap ⋯ → triage sheet (Push/Delegate/Deprioritize/Dismiss).
- **Fallbacks:**
  - **Android:** full custom-view notification with all controls inline (RemoteViews + RemoteInput). [CONFIRMED capability]
  - **iOS [PLATFORM-LIMITED]:** text-input action for add (works) + **Complete** + **Open** action buttons; content extension shows top tasks as display; ⋯ triage **deep-links into the app sheet**. Intent preserved (capture inline, complete inline); deep triage moves in-app.

### A2. End-of-day report notification
- **Purpose:** Daily summary + entry to tomorrow planning.
- **Regions:** Header ("Today, wrapped") · Stat row · Highlights · CTA.
- **Components:** counts (Done / Pushed / Delegated / Dismissed / Deprioritized), timer minutes planned vs used, 1–2 highlight lines, **Plan tomorrow** (primary), **Review history** (secondary).
- **States:** standard · low-activity ("Quiet day — let's set up tomorrow") · high-activity (celebratory note).
- **Interactions:** tap CTA → Tomorrow Planner (5.x). 
- **Fallbacks:** Android renders rich custom view; iOS uses standard expanded notification with up to 2 actions, full report rendered in-app on tap.

### A3. Delegation / push follow-up notification
- **Purpose:** Resurface a delegated or pushed task at its `fire_at`.
- **Components:** *"Following up — did [assignee] finish [task]?"* (delegation) or *"Back on your plate: [task]"* (push) with **Complete / Re-push / Still waiting** actions.
- **Fallbacks:** same Android-inline / iOS-deep-link split as A1.

### A4. Home-screen widget (small / medium / large)
- **Purpose:** Glanceable + lightly interactive task surface.
- **Regions:** Header (count + "+ Add") · Task rows (3–5) · Footer (mini summary on large).
- **Components:** next tasks with time/timer chip + one-tap **Complete**; **+ Add** affordance; large size adds done/pushed counts.
- **States:** populated · empty ("All clear — tap to add") · loading/stale (last-synced snapshot).
- **Interactions:**
  - **Android:** Complete and Add act **in place** (RemoteViews/Glance + PendingIntent).
  - **iOS 17+:** Complete and Add via **App Intents** (in-place where allowed).
  - **iOS < 17 [PLATFORM-LIMITED]:** taps **deep-link** to app Quick Add / Today. Intent preserved (fast capture/complete), mechanism differs.
- **Fallbacks:** widget never holds independent state; always reflects the canonical store.

---

## B. App screens

### B1. Onboarding (multi-step)
- **Purpose:** Set the proactive-assistant expectation and configure cadence/permissions.
- **Screens in flow:** Welcome → Permission priming → Cadence picker → Quiet hours & EOD time → Seed tasks (optional) → Sample preview → Done.
- **Components:** value-prop copy, OS permission CTA (notifications; Android exact-alarm; iOS time-sensitive), cadence toggle (Anchor slots default 9/12/15/18 vs Every N hours), time pickers, starter-task input, animated sample notification.
- **States:** permission granted / denied (denied → reduced-function banner + re-prompt path).
- **Interactions:** Back/Next; "Skip" on optional steps. Completion lands on **Today (B2)**.
- **Fallbacks:** if notifications denied, app still works as a manual list with an in-app "check-in" banner; persistent CTA to enable.

### B2. Home — Today (default screen)
- **Purpose:** Full-fidelity surface; the only place every action is guaranteed available.
- **Regions:** Top bar (date + summary strip) · **Quick Add** (prominent) · Task list grouped by time · Bottom nav.
- **Components:** summary strip (Done/Pushed/Delegated counts) · Quick Add field with **Set time (primary)** / **Set timer (timerAccent secondary)** · task rows (title, time/timer chip, tick, ⋯) · grouped sections (Overdue, Now/Soon, Timed, Anytime) · FAB or inline add · bottom nav (Today · History · Tomorrow · Settings).
- **States:** populated · empty · completed-collapsed · timer-running (live countdown chip) · offline (local-first, no blocker).
- **Interactions:** add, complete (fade/collapse + undo snackbar), tap row → Task Detail (B3), ⋯ → triage sheet (B4), pull-to-refresh (no-op visual; local-first).
- **Fallbacks:** none needed — canonical fallback target for all surfaces.

### B3. Task detail / editor
- **Purpose:** View and edit one task and its full history.
- **Regions:** Title · Scheduling control · State/category · Event trail · Actions.
- **Components:** editable title; **scheduling_mode** switch (Due time ↔ Timer ↔ Unscheduled); time/duration pickers (Set time primary, Set timer timerAccent); **Extend time** (timer) vs **Reschedule** (due time) as distinct affordances; priority toggle; append-only **event trail** (created → pushed → completed with timestamps/reasons); triage actions.
- **States:** new (from capture) · editing · in_progress (timer) · terminal (read-mostly with reactivate where applicable).
- **Interactions:** save on change (autosave); start/extend timer; trigger any triage; reactivate a pushed/deprioritized task.

### B4. Triage sheet (bottom sheet)
- **Purpose:** Host the four triage actions consistently across surfaces' deep-links.
- **Components / order (by frequency):**
  1. **Push to tomorrow** → optional reason + reminder time, or **"Just push (auto-reminder)"** one-tap (default = first slot tomorrow).
  2. **Handed over to a team member** → assignee (optional) + "Add follow-up reminder?" → time or skip.
  3. **Not a priority (Deprioritize)** → ask new timeline.
  4. **Dismiss — reasons I don't have** → reasonless close, logged under Dismissed.
- **States:** each action expands its own minimal prompt inline; confirm/cancel.
- **Interactions:** on confirm → write category event, schedule any FollowUpReminder, remove from active list.
- **Fallbacks:** this sheet **is** the iOS fallback target for notification/widget triage. [PLATFORM-LIMITED resolution]

### B5. History (categorized logs)
- **Purpose:** Review what happened, segregated by action category.
- **Regions:** Date-range selector · Stats header · Category tabs/filters · List.
- **Components:** range (Today/Week/Custom); stats header (completion rate, push rate); tabs (Completed · Pushed · Delegated · Dismissed · Deprioritized) with counts; per-row task + action time + reason + linked follow-up; tap row → Task Detail event trail.
- **States:** populated per category · empty per category · loading.
- **Interactions:** filter, drill into a task's trail.
- **Fallbacks:** none; in-app only.

### B6. Tomorrow planner
- **Purpose:** Lay out tomorrow from real carry-over.
- **Regions:** Header (date) · Seeded list · Add row · Timeline preview · Confirm.
- **Components:** pre-seeded carry-over (Pushed + due Delegations + recurring); per item assign **time or timer**; drag reorder; "+ Add" new; a timeline preview of the day; **Confirm plan**.
- **States:** seeded · edited · confirmed (summary of the day ahead) · empty (blank-day quick-start).
- **Interactions:** assign/reorder/add → Confirm pre-schedules tomorrow's check-ins around commitments.
- **Fallbacks:** opened from EOD report (A2) or bottom nav.

### B7. Settings
- **Purpose:** Control cadence, quiet hours, EOD time, notifications, defaults.
- **Components:** cadence model + slots/interval; quiet hours; EOD report time; max pings/day; default auto-reminder time; positive-note tone toggle; permissions status + deep links to OS settings; (V2) account/sync.
- **States:** permission-healthy vs degraded (banner + fix CTA, incl. Android OEM battery-whitelist guidance).
- **Interactions:** edits write to scheduler config and reschedule.

### B8. Empty / error / permission-degraded states (cross-cutting)
- **Empty:** friendly, action-oriented copy + add CTA on every list.
- **Notifications denied:** persistent banner on Today; in-app manual "check-in now" button as fallback for the proactive ping.
- **Android exact-alarm/battery restricted [PLATFORM-LIMITED]:** detect → explain → deep-link to whitelist; reschedule defensively on boot.
- **Timer interrupted by OS kill:** restore from persisted `timer_remaining` on next launch.

---

## C. Cross-surface interaction rules (summary)
- Capture works inline **everywhere**; deep triage is inline on Android, in-app sheet on iOS.
- Default visible tasks: **3** (collapsed) / **5–6** (expanded) / "+N more → open app."
- Completed = fade to `muted` + strikethrough ~1s, then collapse; undo available briefly.
- **Set time = primary (brand); Set timer = secondary (timerAccent)** on every surface.
- One-tap surfaces expose only terminal-safe actions (Complete, Snooze); anything needing input deep-links rather than silently failing.
- Positive note: one short, tone-matched, time-management-framed line after each check-in list and on the EOD report.
