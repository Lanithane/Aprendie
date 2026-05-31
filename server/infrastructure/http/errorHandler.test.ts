import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler'

function mockRes() {
  const captured: { code?: number; body?: unknown } = {}
  const res = {
    status(code: number) {
      captured.code = code
      return res
    },
    json(body: unknown) {
      captured.body = body
      return res
    },
  }
  return { res: res as unknown as Response, captured }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// A 500 must return a generic body — never echo the error (which could carry a secret) to the client.
describe('errorHandler', () => {
  it('returns a generic 500 body and does not echo error details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { res, captured } = mockRes()
    const secret = 'sk-ant-leaked-secret'
    errorHandler(new Error(`boom ${secret}`), {} as Request, res, vi.fn())
    expect(captured.code).toBe(500)
    expect(captured.body).toEqual({ error: 'internal server error' })
    expect(JSON.stringify(captured.body)).not.toContain(secret)
  })
})
