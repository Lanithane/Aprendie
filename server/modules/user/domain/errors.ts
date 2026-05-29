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
