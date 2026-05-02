import OpenAI from 'openai'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onRequest } from 'firebase-functions/v2/https'
import { appForgeGenerationJsonSchema } from './appSpecJsonSchema'
import { buildGenerateAppSpecInput } from './generateAppSpecPrompt'
import { sanitizeAppSpec } from './sanitizeAppSpec'
import type {
  GenerateAppSpecRequest,
  GenerateAppSpecResponse,
} from './appSpecTypes'

const openAiApiKey = defineSecret('OPENAI_API_KEY')
const maxPromptLength = 800
const maxModelSummaryLength = 1800
const maxOutputTokens = 2500
const defaultModel = 'gpt-5.4-nano'
const oneHourMs = 60 * 60 * 1000
const oneDayMs = 24 * oneHourMs
const minRequestSpacingMs = 15 * 1000
const maxRequestsPerHourPerClient = 5
const maxRequestsPerProcessDay = 25

interface RateLimitEntry {
  count: number
  lastRequestAt: number
  windowStartedAt: number
}

interface RequestSource {
  ip?: string
  headers?: Record<string, string | string[] | undefined>
}

let processWindowStartedAt = Date.now()
let processRequestCount = 0
const clientRateLimits = new Map<string, RateLimitEntry>()

const allowedOrigins = [
  'https://flyboi96.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const firstHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const clientKeyFrom = (request: RequestSource) => {
  const forwardedFor = firstHeaderValue(request.headers?.['x-forwarded-for'])
  const firstForwardedIp = forwardedFor?.split(',')[0]?.trim()

  return firstForwardedIp || request.ip || 'unknown-client'
}

const enforceRateLimit = (clientKey: string) => {
  const now = Date.now()

  if (now - processWindowStartedAt > oneDayMs) {
    processWindowStartedAt = now
    processRequestCount = 0
    clientRateLimits.clear()
  }

  if (processRequestCount >= maxRequestsPerProcessDay) {
    throw new HttpsError(
      'resource-exhausted',
      'Daily test-phase AI generation limit reached for this function instance. Use the local fallback or try again tomorrow.',
    )
  }

  const existingEntry = clientRateLimits.get(clientKey)
  const entry =
    existingEntry && now - existingEntry.windowStartedAt <= oneHourMs
      ? existingEntry
      : { count: 0, lastRequestAt: 0, windowStartedAt: now }

  if (now - entry.lastRequestAt < minRequestSpacingMs) {
    throw new HttpsError(
      'resource-exhausted',
      'AI generation is rate limited during testing. Wait a few seconds before trying again.',
    )
  }

  if (entry.count >= maxRequestsPerHourPerClient) {
    throw new HttpsError(
      'resource-exhausted',
      'Hourly test-phase AI generation limit reached. Use the local fallback or try again later.',
    )
  }

  entry.count += 1
  entry.lastRequestAt = now
  clientRateLimits.set(clientKey, entry)
  processRequestCount += 1
}

const readPrompt = (data: unknown) => {
  if (!isRecord(data) || typeof data.prompt !== 'string') {
    throw new HttpsError('invalid-argument', 'A prompt string is required.')
  }

  const prompt = data.prompt.trim()

  if (!prompt) {
    throw new HttpsError('invalid-argument', 'Prompt cannot be empty.')
  }

  if (prompt.length > maxPromptLength) {
    throw new HttpsError(
      'invalid-argument',
      `Prompt must be ${maxPromptLength} characters or fewer.`,
    )
  }

  return prompt
}

const readModelSummary = (data: unknown) => {
  if (!isRecord(data) || typeof data.existingAppSpecModelSummary !== 'string') {
    return undefined
  }

  return data.existingAppSpecModelSummary.trim().slice(0, maxModelSummaryLength)
}

const modelWarningsFrom = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((warning): warning is string => typeof warning === 'string')
        .map((warning) => warning.trim())
        .filter(Boolean)
        .slice(0, 8)
    : []

const errorDetailsFrom = (error: unknown) => {
  if (!isRecord(error)) {
    return {
      name: 'UnknownError',
      message: String(error),
    }
  }

  return {
    name: typeof error.name === 'string' ? error.name : 'Error',
    message: typeof error.message === 'string' ? error.message : String(error),
    status: typeof error.status === 'number' ? error.status : undefined,
    code: typeof error.code === 'string' ? error.code : undefined,
    type: typeof error.type === 'string' ? error.type : undefined,
  }
}

const callableDataFrom = (body: unknown) => {
  if (!isRecord(body) || !('data' in body)) {
    throw new HttpsError('invalid-argument', 'Callable request body must include data.')
  }

  return body.data
}

const callableErrorByCode: Record<
  string,
  { httpStatus: number; callableStatus: string }
> = {
  aborted: { httpStatus: 409, callableStatus: 'ABORTED' },
  cancelled: { httpStatus: 499, callableStatus: 'CANCELLED' },
  'data-loss': { httpStatus: 500, callableStatus: 'DATA_LOSS' },
  'deadline-exceeded': {
    httpStatus: 504,
    callableStatus: 'DEADLINE_EXCEEDED',
  },
  'failed-precondition': {
    httpStatus: 400,
    callableStatus: 'FAILED_PRECONDITION',
  },
  internal: { httpStatus: 500, callableStatus: 'INTERNAL' },
  'invalid-argument': {
    httpStatus: 400,
    callableStatus: 'INVALID_ARGUMENT',
  },
  'not-found': { httpStatus: 404, callableStatus: 'NOT_FOUND' },
  'out-of-range': { httpStatus: 400, callableStatus: 'OUT_OF_RANGE' },
  'permission-denied': {
    httpStatus: 403,
    callableStatus: 'PERMISSION_DENIED',
  },
  'resource-exhausted': {
    httpStatus: 429,
    callableStatus: 'RESOURCE_EXHAUSTED',
  },
  unauthenticated: { httpStatus: 401, callableStatus: 'UNAUTHENTICATED' },
  unavailable: { httpStatus: 503, callableStatus: 'UNAVAILABLE' },
  unimplemented: { httpStatus: 501, callableStatus: 'UNIMPLEMENTED' },
  unknown: { httpStatus: 500, callableStatus: 'UNKNOWN' },
}

const normalizedHttpsErrorFrom = (error: unknown) => {
  if (error instanceof HttpsError) {
    return error
  }

  const errorDetails = errorDetailsFrom(error)
  logger.error('generateAppSpec failed.', errorDetails)
  console.error('generateAppSpec failed.', errorDetails)

  return new HttpsError(
    'internal',
    'AI app generation failed. You can retry or use the local mock fallback.',
    errorDetails,
  )
}

const generateAppSpecResponseFrom = async (
  data: GenerateAppSpecRequest | unknown,
  requestSource: RequestSource,
): Promise<GenerateAppSpecResponse> => {
  const prompt = readPrompt(data)
  const existingAppSpecModelSummary = readModelSummary(data)
  const model = process.env.OPENAI_MODEL || defaultModel
  enforceRateLimit(clientKeyFrom(requestSource))

  const client = new OpenAI({ apiKey: openAiApiKey.value() })

  logger.info('Generating AppForge AppSpec with OpenAI.', {
    model,
    maxOutputTokens,
    promptLength: prompt.length,
  })

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content:
          'You generate safe local-only AppForge AppSpec JSON. You never generate executable code.',
      },
      {
        role: 'user',
        content: buildGenerateAppSpecInput(
          prompt,
          existingAppSpecModelSummary,
        ),
      },
    ],
    max_output_tokens: maxOutputTokens,
    text: {
      format: {
        type: 'json_schema',
        name: 'appforge_generation',
        strict: true,
        schema: appForgeGenerationJsonSchema,
      },
    },
  })

  const outputText = (response as { output_text?: string }).output_text

  if (!outputText) {
    throw new Error('OpenAI response did not include output_text.')
  }

  const parsed: unknown = JSON.parse(outputText)

  if (!isRecord(parsed) || !('appSpec' in parsed)) {
    throw new Error('OpenAI response did not include appSpec.')
  }

  const sanitized = sanitizeAppSpec(parsed.appSpec)
  const warnings = [
    `Test-phase guardrails active: ${model}, ${maxOutputTokens} max output tokens, ${maxRequestsPerHourPerClient} requests per hour per client.`,
    ...modelWarningsFrom(parsed.warnings),
    ...sanitized.warnings,
  ].slice(0, 12)

  return {
    appSpec: sanitized.appSpec,
    warnings,
  }
}

export const generateAppSpec = onRequest(
  {
    cors: allowedOrigins,
    invoker: 'public',
    maxInstances: 1,
    memory: '512MiB',
    region: 'us-central1',
    secrets: [openAiApiKey],
    timeoutSeconds: 60,
  },
  async (request, response): Promise<void> => {
    if (request.method !== 'POST') {
      response.set('Allow', 'POST')
      response.status(405).json({
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'generateAppSpec only accepts POST callable requests.',
        },
      })
      return
    }

    try {
      const result = await generateAppSpecResponseFrom(
        callableDataFrom(request.body),
        {
          headers: request.headers,
          ip: request.ip,
        },
      )

      response.status(200).json({ data: result })
    } catch (error) {
      const httpsError = normalizedHttpsErrorFrom(error)
      const errorInfo =
        callableErrorByCode[httpsError.code] ?? callableErrorByCode.internal
      const details = (httpsError as { details?: unknown }).details

      response.status(errorInfo.httpStatus).json({
        error: {
          details,
          message: httpsError.message,
          status: errorInfo.callableStatus,
        },
      })
    }
  },
)
