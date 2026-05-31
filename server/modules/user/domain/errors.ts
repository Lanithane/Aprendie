export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User not found: ${id}`)
    this.name = 'UserNotFoundError'
  }
}

export class LastAdminError extends Error {
  constructor() {
    super('Cannot demote the last remaining admin')
    this.name = 'LastAdminError'
  }
}

// Thrown when a non-approved account attempts an action that would spend the operator
// key (Epic 12). Carries the access state so the API/UI can distinguish pending vs blocked.
export class AccessDeniedError extends Error {
  constructor(public readonly access: 'pending' | 'blocked') {
    super(access === 'blocked' ? 'Account access has been blocked' : 'Account is pending approval')
    this.name = 'AccessDeniedError'
  }
}
