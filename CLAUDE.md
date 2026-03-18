# CLAUDE.md

## Training Philosophy

This app is built around high-frequency, moderate-volume training with an emphasis on proximity to failure. Most sets are taken to 1 RIR (1 rep in reserve). This means:

- **Reps are the primary variable** — weight stays fixed more often than reps change. Reps fluctuate with fatigue, exercise order, and where something falls in the session. Do not treat weight as the only signal of progress.
- **Volume is set counts only** — never weight × reps, never tonnage. These figures are meaningless for this style of training. Volume is tracked purely as sets per muscle group per session.
- **Progressive overload is two independent signals** — more weight over time, or more reps at the same weight. Never combined into a single number.
- **Sessions follow a non weekly cycle** — not a calendar week. Volume comparisons and program logic should be cycle-aware, not week-aware.
- **The program is intentional** — exercises are consistent session to session and only changed deliberately. Same-day substitutions (due to busy equipment) and drops (due to time) are session-level deviations that never modify the program template.
- **Entry speed is the primary UX constraint** — the app is used at the gym, one-handed, mid-workout. Any friction in logging is a real cost. Configuration, editing, and review are secondary to fast set entry.

## Key Design Decisions

- **Tags are the single mechanism** for exercise variations, gym location, and any future modifiers. Do not build separate entities for gyms or variations. A gym is a tag.
- **Gym tags scope progressive overload** for equipment-dependent exercises (cables, machines) but not for free weights, which are gym-agnostic.
- **Programs are not inferred from history** — they are explicitly maintained. Session history is a record of what happened, not a source of truth for what should happen next.
- **Unilateral exercises track reps per side** — weight is always per-side, never doubled. The weaker side is the canonical rep count for progression tracking.
- **Volume taxonomy is a fixed enum** — muscle groups are predefined and granular (e.g. upper_chest, not just chest). Freeform muscle group labels are not allowed.
