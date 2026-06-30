# Nudge — Feature-Prioritized MVP Roadmap

> Companion to `notification-task-app-prd.md`. Prioritizes every feature into shippable phases with rationale, dependencies, platform notes, and exit criteria. Android-first per the PRD build recommendation.

## Prioritization method
Each feature is scored on **Value** (to the core hypothesis: *people will triage tasks inside the notification surface*) and **Effort**, then placed in a phase. Priority labels:
- **P0** — without it the product has no identity. Must ship in MVP.
- **P1** — strongly expected; ship in MVP if effort allows, else fast-follow.
- **P2** — meaningful depth; V1.1.
- **P3** — V2 differentiation / analytics / scale.

The MVP exit bar: *a user is pinged on a schedule, captures and completes a task from the notification, triages it into a category, sees an end-of-day report, and plans tomorrow* — on Android at full strength, on iOS via the documented fallbacks.

---

## Phase 0 — Foundations (pre-feature, enabling work)
| Feature | Priority | Effort | Depends on | Notes |
|---|---|---|---|---|
| Local-first data store (entities from §4) | P0 | M | — | Room (Android) / SwiftData (iOS); single canonical source |
| Append-only event stream per task | P0 | S | store | Powers history + state machine |
| SchedulerService (cadence, quiet hours, dedupe, supersede) | P0 | L | store | The heart; reschedule on boot/timezone |
| Notification dispatch layer (platform notifiers) | P0 | M | scheduler | Android custom view + RemoteInput; iOS UNNotification + actions |
| Permission + onboarding plumbing | P0 | M | — | Notifications; Android exact-alarm; iOS time-sensitive |

**Exit criteria:** a scheduled local notification fires at the right time, survives reboot, and reads live tasks from the store.

---

## Phase 1 — MVP core (the irreducible product)
| Feature | Priority | Effort | Platform notes |
|---|---|---|---|
| Recurring check-in notification (anchor slots + quiet hours) | P0 | M | Android full inline; iOS text-input + actions |
| Inline quick-add from notification | P0 | M | Both OSes via reply/text-input action |
| One-tap complete (notification + app) + fade/collapse + undo | P0 | S | Android inline; iOS Complete action |
| Activity: due-time OR timer (Set time primary / Set timer accent) | P0 | M | Mutually exclusive per task; switchable |
| Triage overflow: Push / Delegate / Deprioritize / Dismiss | P0 | M | Android inline sheet; iOS deep-link to in-app sheet |
| FollowUpReminder for Pushed + Delegated | P0 | M | Scheduled via SchedulerService |
| Categorized History (5 categories) + per-task trail | P0 | M | In-app only |
| End-of-day report notification | P0 | M | Android rich; iOS standard + in-app detail |
| Tomorrow planner seeded with carry-over | P0 | M | Pushed + due delegations |
| App Home — Today (full-fidelity fallback surface) | P0 | M | Canonical fallback for all surfaces |
| Tone-matched positive note (basic ruleset) | P1 | S | Rule-based, not random |
| Settings (cadence, quiet hours, EOD time, max pings) | P1 | S | Writes scheduler config |
| One home-screen widget (complete + add) | P1 | M | Android in-place; iOS 17+ App Intent / <17 deep-link |

**Exit criteria (MVP / Android-first reference build):**
- User configures cadence in onboarding; receives pings; adds and completes a task inline; triages into all five categories; pushed/delegated tasks resurface via follow-up; history shows correct categorized trails; EOD report fires and opens a seeded tomorrow planner.
- iOS build delivers the same outcomes via fallbacks (capture inline, triage in-app), with the capability matrix documented in-app.

---

## Phase 2 — V1.1 fast-follow (depth & polish)
| Feature | Priority | Effort | Notes |
|---|---|---|---|
| Natural-language time parsing on capture | P2 | M | "call at 3pm" → pre-filled due_time |
| Timer foreground service + live countdown chip | P2 | M | Android foreground service; iOS Live Activity (V2-leaning) |
| Adaptive default-reminder suggestions | P2 | S | Based on user's typical slots |
| Richer positive-note engine (context-aware tone) | P2 | S | Tone shifts on completion rate |
| Widget size variants (small/medium/large) | P2 | M | Large adds summary counts |
| Recurring tasks & templates | P2 | M | Daily/weekly repeats |
| Undo/redo across triage actions | P2 | S | Beyond complete |
| Onboarding sample-notification preview polish | P3 | S | Conversion aid |

---

## Phase 3 — V2 (differentiation, analytics, scale)
| Feature | Priority | Effort | Notes |
|---|---|---|---|
| Time-analysis dashboard (planned vs used, trends, leaks) | P3 | L | The premium hook |
| Adaptive check-in cadence (learns when you act) | P3 | L | Anti-fatigue intelligence |
| Cloud sync + multi-device + accounts | P3 | L | Backend introduction |
| Collaborative delegation (teammate acknowledgment) | P3 | L | Beyond single-user reminder |
| Calendar integration for due-time placement | P3 | M | Two-way optional |
| Live Activities for running timers (iOS) | P3 | M | Expands iOS interactivity |
| LLM-assisted positive notes / planning suggestions | P3 | M | Tone-controlled |
| Web / companion surface + history export | P3 | L | Reach |

---

## Sequencing logic & critical path
1. **Phase 0 must complete first** — scheduler + store + notification dispatch are prerequisites for nearly everything.
2. **Notification inline-add + complete** is the highest-value, earliest-validatable slice of the core hypothesis — build it before triage depth.
3. **Triage + categories + history** form one coherent unit (they share the event stream) — build together.
4. **EOD report → Tomorrow planner** is the second ritual loop; ship after the daytime loop is stable.
5. **Widget** is P1 not P0: it reuses the store and complete/add intents, so it's cheap once those exist, but the notification is the primary differentiator and should be validated first.
6. iOS is built **in parallel as the fallback-adapted track**, never as the spec ceiling.

## Anti-fatigue guardrails shipped in MVP (non-negotiable)
- Max ~4 pings/day default, quiet hours on by default, dedupe unread (supersede), per-ping snooze, easy "fewer pings" control. (Adaptive cadence is V2, but the static guardrails ship in MVP.)

## Platform-limited features — kept, not dropped
| Intent | Android (MVP) | iOS fallback (MVP) |
|---|---|---|
| Fully interactive notification workspace | Native (custom view + inline controls) | Capture inline + Complete; triage in-app sheet |
| Interactive home-screen widget | In-place actions | App Intent (17+) / deep-link (<17) |
| Precise recurring scheduling | Exact alarms (+ battery whitelist) | OS-managed local notifications; reschedule defensively |
