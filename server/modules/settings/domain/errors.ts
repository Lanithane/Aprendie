// Thrown when the operator has flipped the global spend pause (maintenance) and a
// non-admin tries to spend the operator key. Mapped to 503 by the error handler.
export class SpendPausedError extends Error {
  constructor() {
    super('Practice is paused right now')
    this.name = 'SpendPausedError'
  }
}

// Thrown when new-account creation is paused and a brand-new (non-admin) Google
// identity attempts to sign up. Existing users are unaffected.
export class SignupsPausedError extends Error {
  constructor() {
    super('New signups are paused right now')
    this.name = 'SignupsPausedError'
  }
}
