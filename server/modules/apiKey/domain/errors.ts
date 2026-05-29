export class MissingApiKeyError extends Error {
  constructor() {
    super('User has not provided an Anthropic API key')
    this.name = 'MissingApiKeyError'
  }
}

export class InvalidApiKeyError extends Error {
  constructor(reason: string) {
    super(`API key validation failed: ${reason}`)
    this.name = 'InvalidApiKeyError'
  }
}
