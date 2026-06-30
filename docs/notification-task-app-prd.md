# Product Brief & PRD Starter — "Nudge" (Working Title)

> A notification-first task manager that proactively checks in throughout the day, lets you act on tasks **without opening the app**, and closes each day with a status report and a tomorrow-planning ritual.

**Document status:** PRD starter / execution-ready brief
**Audience:** Product, UX, prototyping, and developer handoff
**Author role context:** Senior PM + mobile UX + staff mobile architect

A note on conventions used throughout this document:
- **[CONFIRMED]** — a requirement taken directly from the original concept.
- **[REFINEMENT]** — a recommended clarification, default, or addition. Flagged so the founder can accept or reject it independently.
- **[PLATFORM-LIMITED]** — a desired behavior that an OS restricts. It is preserved, not deleted, with a fallback.

---

## 1. Product concept

**Nudge** is a notification-first task manager that behaves less like a list you visit and more like an assistant that visits you. At configurable intervals across the day it proactively pings — *"Hey, what's up — anything to add?"* — and surfaces your live task list directly inside the notification, a home-screen widget, or the app, so you can capture, schedule, complete, postpone, or delegate a task in two taps without context-switching. Every action you take is categorized (done, pushed, delegated, dismissed, deprioritized), and at end of day the app delivers a status report plus a guided flow to lay out tomorrow.

**What makes it distinctive:**
- **The app initiates, not the user.** Most to-do apps are passive repositories; Nudge is an active interlocutor. The recurring proactive check-in *is* the product, not a reminder feature bolted onto a list.
- **The notification surface is a first-class workspace,** not a one-tap launcher. Capturing and triaging tasks happens inline, modeled on the rich-reply / persistent-control interaction patterns of WhatsApp and media-player notifications.
- **It is opinionated about time management.** "Set time" vs. "set timer," follow-up reminders on delegation, and the categorized action log frame the product as a lightweight time-analysis tool, not just a checklist.
- **The day has a shape.** Daytime capture → end-of-day report → tomorrow planning is a deliberate ritual loop that competitors don't close.

---

## 2. Refined requirements

### 2.1 Proactive check-in engine
- **[CONFIRMED]** The app pings the user on a recurring schedule across the day, at an interval/cadence set in reminder preferences.
- **[CONFIRMED]** Each ping lists the activities saved so far.
- **[CONFIRMED]** Each ping invites the user to add a new activity.
- **[REFINEMENT]** Support both a **fixed-interval model** (every N hours) and a **fixed-time-slots model** (e.g., 9:00, 12:00, 15:00, 18:00). Default to fixed slots at 4 anchor points; expose interval as an advanced option.
- **[REFINEMENT]** Add **quiet hours** (default 22:00–08:00, except the EOD report) and a per-ping **snooze** to defend against notification fatigue.

### 2.2 Activity (task) model
- **[CONFIRMED]** A user can add an activity and assign it either a **due time** (when it should happen) or a **timer** (a countdown/duration to spend on it).
- **[CONFIRMED]** "Set time" is the **primary** action; "Set timer" is the **secondary** action, rendered in a contrasting accent color to reinforce the time-analysis personality.
- **[CONFIRMED]** A user can tick-mark an activity to complete it; completed items **fade out** of the notification/widget list.
- **[CONFIRMED]** Against a non-completed activity the user can: set a new deadline, add more time to the timer, or open a triage dropdown.
- **[CONFIRMED]** The triage dropdown options are:
  - **a) Not a priority** → ask for a new timeline.
  - **b) Handed over to a team member** → offer a follow-up reminder time.
  - **c) Dismiss (reason unknown / "reasons I don't have")** → close with no reason.
  - **d) Push to tomorrow** → ask for a reason and/or reminder time, or accept a default auto-reminder.
- **[REFINEMENT]** Normalize the four options into a stable **action-category taxonomy**: `Completed`, `Deprioritized`, `Delegated`, `Dismissed`, `Pushed`. (Completed is its own category even though it's triggered by the tick, not the dropdown.)

### 2.3 Action history & analytics
- **[CONFIRMED]** All actions taken against activities are viewable, **segregated by the option/category selected** — categories *are* the action types.
- **[REFINEMENT]** Treat the log as an append-only **event stream** per task, so a task that was pushed twice then completed shows a full trail. Categorized views are filters over this stream.

### 2.4 Positive note system
- **[CONFIRMED]** After the activity list ends, show a **time-management positive note**.
- **[REFINEMENT]** Make notes context-aware (tone shifts based on completion rate) rather than random, to keep them from feeling canned.

### 2.5 Cross-surface parity
- **[CONFIRMED]** Everything above must also be possible through a **home-screen widget** and the **app home screen** — not only the notification.
- **[REFINEMENT]** Define an explicit **capability tier per surface** (see §6 and §7) because OS constraints mean true 1:1 parity is impossible; aim for *functional* parity with graceful fallback.

### 2.6 End-of-day report & tomorrow planning
- **[CONFIRMED]** Around **22:00 (default, configurable)** the app posts a status report to the notification center: what was done, how many pushed to tomorrow, and key details.
- **[CONFIRMED]** Tapping the report opens a **new screen** to prepare tomorrow — choosing which activity to do at what time.
- **[REFINEMENT]** Pre-populate the tomorrow planner with all `Pushed` tasks plus any `Delegated` follow-ups due tomorrow, so planning starts from real carry-over, not a blank canvas.

---

## 3. Core experience architecture

### 3.1 Recurring check-in system
A scheduler fires check-ins on the user's chosen cadence. Each check-in renders a **notification instance** containing (a) a capture affordance ("add anything?"), (b) the current open-task list (capped, see §6), and (c) a closing positive note. The scheduler respects quiet hours, dedupes if the previous check-in is still unread, and is the single source of truth that the widget and app home also read from.

### 3.2 Task list behavior
A single canonical task list backs all three surfaces. Open tasks sort by **urgency** (overdue → due-soon → timed → untimed). Completing fades and collapses an item; triaged items leave the active list and move into their category. The list is the same data everywhere; only the *rendering density* and *interaction richness* differ per surface.

### 3.3 Notification interaction model
Built on rich, persistent notifications:
- **Inline capture** via a text-reply action (WhatsApp-style direct reply).
- **Per-task quick actions:** Complete (tick), Set/Extend time, and an overflow for the triage dropdown.
- **Persistent, expandable layout** (media-player / Snaptube-style custom view on Android) showing the top N tasks with controls.
- Fallbacks where the OS forbids custom layouts (see §7).

### 3.4 Widget interaction model
A home-screen widget is a **glanceable + lightly interactive** surface: it shows the next 3–5 tasks, a one-tap complete, and a "+ Add" affordance. On Android, buttons act in place; on iOS, taps deep-link into the app's quick-add or complete intent (see §7). The widget never holds state the backing store doesn't.

### 3.5 App home screen behavior
The app home is the **full-fidelity** surface and the only place where every action is unconditionally available. Default view: **Today** — open tasks grouped by time, a prominent quick-add, a running mini-summary (done / pushed / delegated counts), and entry points to History and the Tomorrow planner. It is also the canonical fallback target for any surface-restricted interaction.

### 3.6 End-of-day report
At the configured time the scheduler composes a **Daily Report** object (counts + highlights) and posts it as a notification. Expanded, it summarizes completed, pushed, delegated, dismissed, deprioritized, and timer-utilization stats. Its primary CTA opens the Tomorrow planner.

### 3.7 Tomorrow planning flow
A dedicated screen seeded with carry-over (pushed tasks + due delegations + recurring items). The user assigns each a time or timer for tomorrow, reorders, and confirms. Confirmation pre-schedules tomorrow's check-ins around those commitments.

### 3.8 Action history / categorized logs
A History view with tabs/filters per category (Completed, Pushed, Delegated, Dismissed, Deprioritized). Each entry shows the task, when the action was taken, the reason (if captured), and any linked follow-up. Backed by the per-task event stream.

### 3.9 Motivational / positive note system
A small content service that selects a closing note for each check-in and the EOD report, tuned to recent performance (encouraging when behind, affirming when ahead). Notes are short, time-management-framed, and never blocking.

---

## 4. Key entities and states

### 4.1 `Activity` (Task) object
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `title` | string | The captured text |
| `scheduling_mode` | enum | `due_time` \| `timer` \| `unscheduled` |
| `due_at` | timestamp? | Set when mode = due_time |
| `timer_duration` | duration? | Set when mode = timer |
| `timer_remaining` | duration? | For active/extended timers |
| `state` | enum | See 4.3 |
| `category` | enum? | Set on triage (4.4) |
| `priority` | enum | `normal` \| `high` (derived or set) |
| `created_at` | timestamp | |
| `events[]` | Event[] | Append-only action history |
| `follow_up_id` | UUID? | Links to a FollowUpReminder |
| `source_surface` | enum | notification \| widget \| app |

### 4.2 Due time vs. timer (semantic distinction)
- **Due time** = a point on the clock the task is anchored to ("Call vendor at 3:00"). Drives overdue logic and check-in placement.
- **Timer** = a *duration of effort* to spend ("Focus on deck for 25 min"). Drives the time-analysis framing; can be extended ("add more time"). The two are mutually exclusive per task at a given moment but a timed task can later be given a due time and vice-versa.

### 4.3 Task states
`captured` → `scheduled` (has due_time or timer) → `in_progress` (timer running) → terminal states: `completed`, `pushed`, `delegated`, `dismissed`, `deprioritized`. `pushed` and `deprioritized` re-enter `scheduled` when their new timeline arrives (they are "soft-terminal" — they reappear). `completed`/`dismissed` are hard-terminal.

### 4.4 Action categories (the taxonomy)
| Category | Trigger | Required follow-up data |
|---|---|---|
| `Completed` | Tick-mark | none |
| `Deprioritized` | "Not a priority" | new timeline |
| `Delegated` | "Handed over to a team member" | (optional) follow-up reminder time + assignee name |
| `Dismissed` | "Dismiss — reasons I don't have" | none (reasonless by design) |
| `Pushed` | "Push to tomorrow" | reason (optional) + reminder time, OR default auto-reminder |

### 4.5 `FollowUpReminder` object
Created by `Delegated` (follow up with teammate) and `Pushed` (reminder tomorrow). Fields: `id`, `activity_id`, `fire_at`, `type` (delegation_followup \| push_reminder), `note`, `assignee?`. Surfaces as its own scheduled notification.

### 4.6 Pushed-to-tomorrow logic
On push: capture optional reason, set `fire_at` to either user-chosen time or **default auto-reminder** (**[REFINEMENT]** default = first check-in slot tomorrow, e.g., 09:00). Task state → `pushed`; it auto-seeds the Tomorrow planner and reappears in tomorrow's active list at `fire_at`.

### 4.7 Delegated / handed-over logic
On delegate: capture assignee (**[REFINEMENT]** optional but recommended), optionally set a follow-up reminder. Task leaves the active list into the `Delegated` category. If a follow-up exists, at `fire_at` the app pings: *"Following up — did [assignee] finish [task]?"* with Complete / Re-push / Still waiting actions.

### 4.8 `NotificationInstance` object
Represents one rendered check-in or report. Fields: `id`, `type` (check_in \| eod_report \| follow_up), `scheduled_for`, `rendered_tasks[]` (snapshot ids + order), `state` (pending \| delivered \| acted \| dismissed \| superseded), `positive_note_id`. Used for dedupe, analytics, and "superseded" replacement so stale notifications get updated rather than stacked.

### 4.9 `DailyReport` object
Fields: `id`, `date`, `completed_count`, `pushed_count`, `delegated_count`, `dismissed_count`, `deprioritized_count`, `timer_minutes_planned`, `timer_minutes_used`, `highlights[]`, `carryover_task_ids[]`. Generated at EOD time; drives the report notification and seeds the planner.

---

## 5. User flows

### 5.1 First-time onboarding
1. Welcome screen states the promise: *"I'll check in with you through the day so nothing slips."*
2. Permission priming **before** the OS prompt: explain why notifications matter, then request notification permission (and, on Android 12+, exact-alarm / on iOS, time-sensitive). 
3. Ask for cadence: choose **Anchor slots** (default 9/12/15/18) or **Every N hours**.
4. Set quiet hours (default 22:00–08:00) and EOD report time (default 22:00).
5. Optional: add 1–3 starter tasks inline to seed the first check-in.
6. Show a sample notification preview so the user knows what to expect. Land on app Home (Today).

### 5.2 Recurring daytime check-in notification
1. Scheduler fires at slot time (if not in quiet hours and prior instance acted/expired).
2. Notification renders: greeting + capture field + top N open tasks with controls + positive note.
3. User can: reply-to-add, complete/extend/triage a task inline, expand for more, snooze, or open the app.
4. Actions write straight to the store; the instance marks `acted`; widget/app reflect immediately.

### 5.3 Adding a task from a notification
1. Tap the inline reply action → keyboard opens in the notification.
2. Type the task → send.
3. Task is created as `captured`. **[REFINEMENT]** Inline follow-up chips appear: "Set time" (primary) / "Set timer" (secondary accent) / "Later." 
4. If a parser detects a time phrase ("at 3pm") **[REFINEMENT]**, pre-fill due_time for one-tap confirm. Otherwise it stays `unscheduled` and resurfaces next check-in.

### 5.4 Marking a task complete
1. Tap the tick on the task (notification, widget, or app).
2. Task → `completed`; logs a `Completed` event; row fades then collapses out of active lists across surfaces.
3. **[REFINEMENT]** Brief undo affordance (in-app snackbar / notification re-expand) for accidental taps.

### 5.5 Postponing / pushing a task
1. Open overflow → "Push to tomorrow."
2. Prompt: optional reason + reminder time, or "Just push (auto-reminder)."
3. Task → `pushed`; `FollowUpReminder` created at chosen/default time; seeds Tomorrow planner; leaves today's active list.

### 5.6 Handing over a task to a team member
1. Overflow → "Handed over to a team member."
2. Enter assignee (optional) → choose "Add follow-up reminder?" → pick time, or skip.
3. Task → `delegated` into the Delegated category; if follow-up set, a delegation reminder is scheduled.

### 5.7 Reviewing categorized action history
1. App → History.
2. Default view: today, grouped by category with counts.
3. Tap a category to filter; tap a task to see its full event trail (created → pushed → completed, with timestamps/reasons).
4. **[REFINEMENT]** Date range selector (Today / Week / Custom) and a tiny stats header (completion rate, push rate).

### 5.8 Receiving and opening the end-of-day report
1. At EOD time the scheduler builds the `DailyReport` and posts the report notification.
2. Expanded: counts (done/pushed/delegated/dismissed/deprioritized) + timer-utilization + a tone-matched note.
3. Primary CTA "Plan tomorrow" → opens the planner. Secondary: "Review history."

### 5.9 Preparing tomorrow's plan
1. Planner opens seeded with carry-over (pushed + due delegations + recurring).
2. For each, assign a time or timer; reorder; add new tasks.
3. Confirm → tasks scheduled for tomorrow; tomorrow's check-ins arranged around them; planner summarizes the day ahead.

---

## 6. Interaction and UX rules

- **What appears in each check-in notification:** greeting line, inline "add" field, the top open tasks, a one-line positive note. The EOD notification swaps the task list for the report summary.
- **Default task count shown:** **3** in collapsed state, up to **5–6** when expanded. Beyond that: a "+N more — open app" affordance. (Both OSes truncate aggressively; never rely on showing the full list in a notification.)
- **Completed items:** fade to ~40% opacity with a strikethrough for ~1s, then collapse out on the next render. They do not linger in the active notification.
- **Inline actions:** one tap = terminal-safe actions only (Complete, snooze). Anything needing input (set time, push reason, delegate) opens a lightweight inline prompt or, where the OS can't, deep-links to a focused app sheet. Never make an inline action silently fail.
- **"Set time" vs "Set timer":** Set time is the **primary** button (filled, brand color). Set timer is **secondary** but rendered in a **contrasting accent** (e.g., brand = deep indigo, timer accent = amber) to signal "this is the analytical/effort-tracking path." Consistent across all surfaces.
- **Dropdown / overflow actions:** the four triage options live behind a single overflow ("⋯ / Manage"), not as four separate buttons (notifications can't host that many). Order by frequency: Push → Delegate → Deprioritize → Dismiss. Each opens its own minimal prompt.
- **Widget vs notification:** the widget is **glanceable-first** — next 3–5 tasks, one-tap complete, "+ Add." It omits the conversational greeting and the inline reason prompts (those deep-link into the app). The notification is **conversational-first** and richer in inline input.
- **App home first view:** **Today** — open tasks grouped by time, prominent quick-add at top, a compact summary strip (done/pushed/delegated), and nav to History and Tomorrow. It is the only surface where every action is guaranteed available.
- **Positive note after the list:** one short, time-management-framed line, tone-matched to performance — e.g. ahead: *"Three down before noon — you're protecting your peak hours well."*; behind: *"Still time to reclaim the afternoon. Pick one and start a timer."* Never guilt-trips; always action-oriented.

---

## 7. Platform feasibility

### Android
- **Realistically possible:** Rich, **custom-layout notifications** (`RemoteViews` / custom notification views) with multiple action buttons, **inline direct reply** (`RemoteInput`), persistent/ongoing notifications, and notifications that update in place. This is the Snaptube/media-player pattern and maps closely to the concept.
- **Strong / native:** Inline text capture, per-task action buttons, foreground-service-backed timers, **interactive home-screen widgets** with tappable buttons that act in place (`RemoteViews` + `PendingIntent`), exact-time scheduling via `AlarmManager` (with `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`).
- **Needs workaround:** OEM **battery optimization / aggressive task-killing** (Xiaomi, Oppo, Samsung) can suppress scheduled alarms — must detect and guide users to whitelist. Android 13+ requires runtime **POST_NOTIFICATIONS** permission. Custom notification views have height limits → cap visible tasks and use "open app for more."
- **MVP on Android:** recurring check-in notification with inline add, top-3 tasks, one-tap complete + overflow triage, an interactive widget, and the EOD report. Android is where the full vision is most achievable.

### iPhone / iOS
- **Realistically possible:** Scheduled local notifications, **Notification Content Extensions** for custom expanded UI, **notification actions** (buttons) and a **text-input action** for inline capture, **Time-Sensitive** interruption level, and **WidgetKit** widgets with **App Intents** for limited interactivity (iOS 17+).
- **Limited:** iOS notifications are **far more constrained** — you cannot build a freely interactive, persistently-updating multi-control surface like Android. Action buttons are limited in number; the custom content extension is **largely non-interactive** (taps generally route into the app). Widgets are **not freely interactive** pre-17 and even on 17+ only support discrete App Intent buttons, not rich inline editing. Background exact scheduling is OS-managed, not guaranteed-precise.
- **Closest fallback UX:** 
  - Inline add → use the notification **text-input action** (works) for capture; richer scheduling deep-links into a focused app sheet.
  - Multi-task inline controls → show top tasks in the content extension as **display**, with 2–3 notification **action buttons** (Complete / Add task / Open) and route triage into the app.
  - Interactive widget → use **App Intent buttons** for Complete and Add (iOS 17+); on older iOS, widget taps deep-link to the relevant app screen.
  - "Push reason"/delegate prompts → always an in-app sheet on iOS.
- **MVP on iOS:** scheduled check-in notification with text-input quick-add + Complete action, a display-focused content extension, a WidgetKit widget (App Intent complete/add on 17+, deep-link fallback below), EOD report notification, and full triage/planning in-app. **[PLATFORM-LIMITED]** The "fully interactive notification workspace" is preserved as a goal but delivered as *capture-in-notification, triage-in-app* on iOS.

**Cross-platform principle:** design for **functional parity, not pixel/interaction parity.** Capture works everywhere inline; deep triage degrades gracefully to the app on iOS while staying inline on Android.

---

## 8. MVP vs V2

### MVP — smallest version that still expresses the core value
- Configurable recurring **check-in notifications** (anchor slots, quiet hours).
- **Inline add** from the notification (both OSes) and **one-tap complete**.
- Task object with **due time OR timer** (set time primary, set timer secondary-accent).
- Triage **overflow** with the four actions (Push / Delegate / Deprioritize / Dismiss), with prompts (deep-linked on iOS).
- Completed-item **fade/collapse**.
- **Categorized history** view (the five categories) with per-task trail.
- **EOD report** notification + **Tomorrow planner** seeded with pushed tasks.
- One **home-screen widget** (next tasks + complete + add; interactive on Android, App-Intent/deep-link on iOS).
- Tone-matched **positive note** (basic ruleset).
- Local-first storage; local notification scheduling.

### V2 — richer interaction, analytics, workflow depth
- Natural-language time parsing on capture; smart default scheduling.
- **Time-analysis dashboard:** planned vs. used timer minutes, completion/push/delegation trends, "where time leaks," peak-hour insights.
- Delegation workflows with assignee contacts and shareable follow-ups; optional teammate-side acknowledgment.
- Adaptive check-in cadence (learns when you actually act) to fight notification fatigue.
- Recurring tasks & templates; calendar integration for due-time placement.
- Cloud sync + multi-device; optional account.
- Richer iOS interactivity as OS capabilities expand; Live Activities for running timers.
- Smarter positive-note engine (personalized, possibly LLM-generated and tone-controlled).
- Web/companion surface; export of history.

---

## 9. Risks and open decisions

Each open decision includes a recommended default.

**Ambiguous requirements**
- *Cadence model (interval vs. fixed slots).* → **Default: fixed anchor slots (9/12/15/18), interval as advanced.**
- *"Reasons I don't have" dismiss.* Interpreted as a deliberately reasonless dismiss. → **Default: dismiss with no reason captured; still logged under Dismissed.**
- *Push "ask for a reason **or** a time."* → **Default: both optional; offer "Just push (auto-reminder at first slot tomorrow)" as one tap.**
- *Does "add more time" apply only to timers or also extend due times?* → **Default: "Extend time" = add to timer; "Reschedule" = move due time. Two distinct affordances.**

**UX risks**
- Overloaded notification (too many controls) becomes unreadable. → **Cap at 3 tasks + overflow; lean on the app for depth.**
- Inline actions that silently fail erode trust. → **Never expose an inline action a surface can't fulfill; deep-link instead.**

**Technical risks**
- OEM battery-killing on Android suppresses check-ins. → **Detect, educate, request whitelist; reschedule defensively on boot.**
- iOS scheduling imprecision and interactivity limits. → **Design iOS as capture-inline / triage-in-app from day one; don't promise Android-grade notifications on iOS.**
- Cross-surface state drift. → **Single canonical store; surfaces are pure reflections; use notification "supersede" to avoid stale stacks.**

**Notification-fatigue risk**
- Frequent proactive pings can feel nagging. → **Defaults: 4/day max, quiet hours on, dedupe unread, snooze, and an easy "fewer pings" control. V2: adaptive cadence.**

**Cross-platform inconsistency risk**
- Feature behaves differently on iOS vs Android, confusing users/marketing. → **Publish an explicit capability matrix; market "capture anywhere, manage in-app," which is honest on both.**

**Founder decisions needed**
- Account model: local-only MVP vs. accounts from day one? → **Recommend local-first MVP, add sync in V2.**
- Is delegation single-user (just a reminder) or collaborative (teammate gets notified)? → **Recommend single-user reminder for MVP; collaborative in V2.**
- Monetization (out of scope here) and whether time-analytics is the premium hook. → **Recommend analytics dashboard as the eventual paid tier.**

---

## 10. Build recommendation

- **Prototype stack:** **Flutter** (fastest path to a credible cross-platform interactive prototype, including widget mock-ups and notification flows) **or** native SwiftUI + Jetpack Compose if the team wants to validate the *real* notification/widget interactions early. For pure flow/UX validation, Flutter; for validating the notification ceiling, native.
- **Production stack:** **Native is strongly recommended** because the product's differentiation lives in OS-specific notification and widget capabilities. **Android: Kotlin + Jetpack Compose**, `RemoteViews`/Glance widgets, `AlarmManager`, `NotificationManager`, foreground service for timers. **iOS: Swift + SwiftUI**, UserNotifications + Notification Content/Service extensions, WidgetKit + App Intents, Live Activities (V2). A cross-platform shell (Flutter/KMP) can host shared business logic with **native modules for notifications/widgets**, but do not abstract those behind a lowest-common-denominator layer.
- **Backend / data model direction:** **Local-first** (SQLite / Room on Android, SwiftData/Core Data on iOS) as the source of truth for MVP, with the entity model from §4 (Activity + append-only event stream + FollowUpReminder + NotificationInstance + DailyReport). Add an optional cloud sync service (e.g., a thin REST/GraphQL backend or a BaaS) in V2 for multi-device.
- **Notification architecture direction:** A single **SchedulerService** owns cadence, quiet hours, dedupe, and "supersede." It composes NotificationInstances from the canonical store and dispatches via platform notifiers. **Android** uses exact alarms + custom-view notifications + RemoteInput. **iOS** uses scheduled `UNNotificationRequest`s with categories/actions + a content extension. Reschedule on boot/timezone change. Keep all action handling idempotent (notification actions can replay).
- **Widget approach:** **Android** — Glance/`RemoteViews` interactive widget acting in place via PendingIntents. **iOS** — WidgetKit with App Intents (interactive complete/add on iOS 17+) and deep-link fallback on older versions. Both read the same store; neither holds independent state.
- **Build order:** **Android-first.** The product's signature behavior — the rich, interactive, persistently-updating notification workspace — is fully realizable on Android and only partially on iOS. Building Android-first lets the core hypothesis (people will triage tasks *inside the notification*) be validated at full strength, then deliberately adapted (capture-inline / manage-in-app) for iOS, rather than designing to iOS's ceiling and under-using Android. If the target market is iOS-dominant, build cross-platform with a native iOS track in parallel but still treat Android as the reference implementation of the interaction model.

---

## 11. Final PRD-style summary

**Product:** Nudge — a notification-first task manager that proactively checks in throughout the day and lets users capture, schedule, complete, postpone, and delegate tasks directly from the notification center, a home-screen widget, or the app, then closes each day with a status report and a guided tomorrow-planning ritual.

**Core value:** The app initiates. It turns idle moments into low-friction task triage at the OS surface the user is already looking at, and frames time as something to be analyzed (set time vs. set timer, follow-ups, categorized action history) rather than just listed.

**Must-have scope (MVP):** configurable recurring check-in notifications (anchor slots + quiet hours, max ~4/day); inline quick-add and one-tap complete on notification and widget; Activity object supporting due-time (primary) or timer (secondary-accent); a four-option triage overflow (Push / Delegate / Deprioritize / Dismiss) producing a five-category, append-only action history (incl. Completed); completed-item fade/collapse; follow-up reminders for delegated and pushed tasks; an end-of-day report notification; a tomorrow planner seeded with carry-over; a tone-matched positive note; local-first storage and scheduling.

**Platform stance:** Functional parity, not interaction parity. **Android** delivers the full interactive-notification + interactive-widget vision natively. **iOS** delivers capture-in-notification + complete-action + WidgetKit/App-Intent (or deep-link) with all deeper triage handled in a focused in-app sheet — preserved as the same feature, adapted to the platform ceiling. **Build Android-first** as the reference implementation of the interaction model.

**Key entities:** Activity (with scheduling_mode, state, category, append-only events), FollowUpReminder, NotificationInstance, DailyReport.

**Primary risks & guardrails:** notification fatigue (capped cadence, quiet hours, snooze, dedupe, adaptive cadence in V2); Android OEM battery-killing (detect + whitelist + reschedule on boot); iOS notification/widget limits (designed-for from day one); cross-surface state drift (single canonical store, surfaces are reflections).

**V2 direction:** time-analysis dashboard (planned vs. used time, completion/push trends), NLP capture, adaptive cadence, recurring tasks & calendar integration, cloud sync/multi-device, collaborative delegation, and richer iOS interactivity (incl. Live Activities for running timers).

**Open founder decisions (with recommended defaults):** account model (local-first MVP), delegation model (single-user reminder MVP), and whether time-analytics becomes the premium tier (recommended).
