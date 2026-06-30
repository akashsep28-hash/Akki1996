# Nudge — Mobile Data Model

> Companion to `notification-task-app-prd.md`. Local-first schema for MVP (Room on Android / SwiftData on iOS), with a sync-ready shape for V2. The store is the single canonical source; all surfaces are reflections of it.

## Design principles
- **Local-first, single source of truth.** Notifications and widgets render snapshots; they never hold authoritative state.
- **Append-only event stream.** Task state changes are recorded as immutable `TaskEvent`s; the task's current state/category is derived (and cached on the row for fast reads). This is what makes categorized history and full per-task trails work.
- **Idempotent action handling.** Notification/widget actions can replay; writes are keyed so a duplicate "complete" is a no-op.
- **Sync-ready.** Every entity carries `id` (UUID), `created_at`, `updated_at`, and a soft `deleted_at`, so a V2 sync layer can be added without a migration of intent.

---

## Entity overview (ER diagram)

```mermaid
erDiagram
    ACTIVITY ||--o{ TASK_EVENT : "has trail"
    ACTIVITY ||--o| FOLLOW_UP_REMINDER : "may schedule"
    ACTIVITY }o--o{ NOTIFICATION_INSTANCE : "rendered in"
    DAILY_REPORT }o--o{ ACTIVITY : "summarizes / carries over"
    SCHEDULE_CONFIG ||--o{ NOTIFICATION_INSTANCE : "drives"
    NOTIFICATION_INSTANCE ||--o| POSITIVE_NOTE : "closes with"
    DAILY_REPORT ||--o| POSITIVE_NOTE : "closes with"

    ACTIVITY {
        uuid id PK
        string title
        string scheduling_mode "due_time|timer|unscheduled"
        datetime due_at "nullable"
        int timer_duration_sec "nullable"
        int timer_remaining_sec "nullable"
        datetime timer_started_at "nullable"
        string state "captured|scheduled|in_progress|completed|pushed|delegated|dismissed|deprioritized"
        string category "nullable: Completed|Pushed|Delegated|Dismissed|Deprioritized"
        string priority "normal|high"
        string source_surface "notification|widget|app"
        uuid follow_up_id FK "nullable"
        datetime created_at
        datetime updated_at
        datetime deleted_at "nullable"
    }

    TASK_EVENT {
        uuid id PK
        uuid activity_id FK
        string type "created|scheduled|timer_started|timer_extended|completed|pushed|delegated|dismissed|deprioritized|reactivated|rescheduled"
        string reason "nullable"
        string assignee "nullable"
        datetime new_timeline_at "nullable"
        string source_surface
        datetime occurred_at
    }

    FOLLOW_UP_REMINDER {
        uuid id PK
        uuid activity_id FK
        string type "delegation_followup|push_reminder"
        datetime fire_at
        string note "nullable"
        string assignee "nullable"
        string state "pending|fired|cancelled"
        datetime created_at
        datetime updated_at
    }

    NOTIFICATION_INSTANCE {
        uuid id PK
        string type "check_in|eod_report|follow_up"
        datetime scheduled_for
        string rendered_task_ids "json snapshot + order"
        string state "pending|delivered|acted|dismissed|superseded"
        uuid positive_note_id FK "nullable"
        uuid daily_report_id FK "nullable"
        datetime created_at
        datetime updated_at
    }

    DAILY_REPORT {
        uuid id PK
        date report_date
        int completed_count
        int pushed_count
        int delegated_count
        int dismissed_count
        int deprioritized_count
        int timer_minutes_planned
        int timer_minutes_used
        string highlights "json"
        string carryover_task_ids "json"
        datetime created_at
    }

    SCHEDULE_CONFIG {
        uuid id PK
        string cadence_model "anchor_slots|interval"
        string anchor_slots "json: [09:00,12:00,15:00,18:00]"
        int interval_hours "nullable"
        time quiet_hours_start "default 22:00"
        time quiet_hours_end "default 08:00"
        time eod_report_time "default 22:00"
        int max_pings_per_day "default 4"
        time default_auto_reminder "default 09:00"
        string note_tone "auto|encouraging|minimal"
        datetime updated_at
    }

    POSITIVE_NOTE {
        uuid id PK
        string text
        string tone "ahead|on_track|behind|neutral"
        string context "check_in|eod"
    }
```

---

## Entity detail & rules

### Activity
- `scheduling_mode` is the discriminator: exactly one of `due_at` / `timer_duration_sec` is meaningful at a time; `unscheduled` means neither. Switching modes is allowed and logged (`rescheduled`/`scheduled` event).
- **Derived/cached:** `state` and `category` are computed from the latest `TaskEvent` and cached on the row for list performance. The event stream is authoritative; the cache is a read optimization rebuilt on write.
- **Soft-terminal vs hard-terminal:** `pushed` and `deprioritized` re-enter `scheduled` when their `new_timeline_at` arrives (a `reactivated` event fires). `completed` and `dismissed` are hard-terminal.
- **Timer math:** `timer_remaining_sec` + `timer_started_at` lets the UI compute live countdown and survive process death; "Extend time" appends to remaining and logs `timer_extended`.

### TaskEvent (append-only)
- Never updated or deleted (except soft-delete cascade). One row per action.
- Drives History categorization (filter by `type`) and the per-task trail (order by `occurred_at`).
- `reason`, `assignee`, `new_timeline_at` are action-specific payload columns (nullable).

### FollowUpReminder
- Created by `pushed` (type `push_reminder`) and `delegated` with follow-up (type `delegation_followup`).
- `fire_at` = user-chosen time or `SCHEDULE_CONFIG.default_auto_reminder` for a "just push."
- On fire → produces a `follow_up` NotificationInstance; state → `fired`. Cancelled if the task is completed/dismissed first.

### NotificationInstance
- One row per rendered check-in / report / follow-up.
- `rendered_task_ids` is a **snapshot** (ids + order) so the instance is reproducible and analytics-stable even as tasks change.
- `state = superseded` enables "replace stale notification" instead of stacking duplicates (dedupe of unread check-ins).

### DailyReport
- Generated at `eod_report_time`; counts derived from that day's `TaskEvent`s; `carryover_task_ids` seeds the Tomorrow planner.

### ScheduleConfig
- Singleton (one row). Owns cadence, quiet hours, EOD time, ping cap, default reminder, note tone. Edits trigger a reschedule.

### PositiveNote
- Small content table selected by `tone` (derived from completion rate) and `context`. Keeps notes purposeful, not random.

---

## State machine (Activity)

```mermaid
stateDiagram-v2
    [*] --> captured: add (any surface)
    captured --> scheduled: set due_time / set timer
    captured --> unscheduled_wait: leave for next check-in
    unscheduled_wait --> scheduled: schedule later
    scheduled --> in_progress: start timer
    in_progress --> scheduled: pause / extend
    scheduled --> completed: tick
    in_progress --> completed: tick
    scheduled --> pushed: push to tomorrow
    scheduled --> delegated: hand over
    scheduled --> deprioritized: not a priority
    scheduled --> dismissed: dismiss
    pushed --> scheduled: reminder fires (reactivated)
    deprioritized --> scheduled: new timeline arrives (reactivated)
    delegated --> completed: follow-up confirms done
    delegated --> pushed: follow-up re-push
    completed --> [*]
    dismissed --> [*]
```

`completed` and `dismissed` are hard-terminal. `pushed`/`deprioritized` are soft-terminal (they return). `delegated` resolves via its follow-up.

---

## Indexing & query notes (implementation-aware)
- Index `Activity(state, due_at)` for the Today grouped list (Overdue/Soon/Timed/Anytime).
- Index `TaskEvent(activity_id, occurred_at)` for trails and `TaskEvent(type, occurred_at)` for category History.
- Index `FollowUpReminder(state, fire_at)` for the scheduler's "what fires next" sweep.
- Index `NotificationInstance(state, scheduled_for)` for dedupe/supersede lookups.
- Keep a small **materialized "today summary"** (done/pushed/delegated counts) cache for the Home summary strip and widget, invalidated on relevant events.

## Sync-readiness (V2)
- All entities already carry `id`/`created_at`/`updated_at`/`deleted_at`. Add a `sync_state` (`local|synced|conflict`) and a server `revision` when sync lands; the append-only event stream makes last-writer-wins or event-merge strategies straightforward without restructuring.
