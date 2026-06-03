import * as userRepository from '../persistence/userRepository'

// Total registered accounts, for the sitewide metrics headline. Exposed via the application
// layer so the metrics module can orchestrate it without touching user persistence directly.
export function getUserCount(): Promise<number> {
  return userRepository.countAll()
}
