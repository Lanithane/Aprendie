// Thrown when an account has reached its per-day graded-sentence cap on the operator key.
// Carries the cap so the API/UI can show the limit.
export class DailyCapExceededError extends Error {
  constructor(public readonly cap: number) {
    super(`Daily limit of ${cap} graded sentences reached`)
    this.name = 'DailyCapExceededError'
  }
}
