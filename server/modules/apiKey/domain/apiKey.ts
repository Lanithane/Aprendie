import { z } from 'zod'

export const apiKeySchema = z
  .string()
  .min(20, 'API key looks too short')
  .startsWith('sk-ant-', 'Anthropic keys start with sk-ant-')

export const apiKeyBodySchema = z.object({ apiKey: apiKeySchema })
