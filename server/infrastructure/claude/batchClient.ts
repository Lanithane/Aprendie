import type { Anthropic } from './anthropicClient'

// Thin, domain-agnostic wrapper over Anthropic's Message Batches API (50% off, up to 24h to
// complete). It only marshals requests in and results out — what to generate and how to parse it
// stays in the calling module, so this stays in infrastructure without importing any module.

// One request in a batch: a caller-chosen `customId` (echoed back on the result so out-of-order
// results can be matched to their request) plus a ready-built Messages-API body.
export interface BatchRequest {
  customId: string
  params: Anthropic.MessageCreateParamsNonStreaming
}

// One result line, after we've collapsed the success/error/expired/canceled union: `message` is
// the model output on success, or null when the request didn't produce one (caller skips those).
export interface BatchResult {
  customId: string
  message: Anthropic.Message | null
}

// Submit a Message Batch; returns the batch id to poll/collect later. Processing starts immediately.
export async function createMessageBatch(
  anthropic: Anthropic,
  requests: BatchRequest[]
): Promise<string> {
  const batch = await anthropic.messages.batches.create({
    requests: requests.map((r) => ({ custom_id: r.customId, params: r.params })),
  })
  return batch.id
}

// True once every request in the batch has settled (succeeded/errored/expired/canceled) and the
// results file is available. The endpoint is idempotent, so this is safe to poll.
export async function isBatchEnded(anthropic: Anthropic, batchId: string): Promise<boolean> {
  const batch = await anthropic.messages.batches.retrieve(batchId)
  return batch.processing_status === 'ended'
}

// Stream the ended batch's `.jsonl` results into memory and normalize each line. Caller matches by
// `customId`. Small batches (one slice per fill here), so collecting to an array is fine.
export async function fetchBatchResults(
  anthropic: Anthropic,
  batchId: string
): Promise<BatchResult[]> {
  const decoder = await anthropic.messages.batches.results(batchId)
  const results: BatchResult[] = []
  for await (const line of decoder) {
    results.push({
      customId: line.custom_id,
      message: line.result.type === 'succeeded' ? line.result.message : null,
    })
  }
  return results
}
