// The signed-in learner's own daily-cap posture, surfaced to the practice UI so it can warn as the
// learner nears the cap and explain the block once they hit it. Raw counts only — where the
// "nearing" threshold sits is a presentation choice the client owns. `capped` is false for admins
// and temporarily-exempt accounts (no cap applies), and the UI hides the banner entirely for them.
export interface DailyUsageSnapshot {
  usedToday: number
  cap: number
  capped: boolean
}
