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
const maxCurrentAppSpecJsonLength = 24000
const maxOutputTokens = 3200
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

type GenerationMode = NonNullable<GenerateAppSpecRequest['mode']>

interface PreserveAppMetadata {
  createdAt: string
  id: string
  version: number
}

interface CurrentAppSpecContext {
  json: string
  preserveMetadata: PreserveAppMetadata
  warning?: string
}

interface ModelRequestContext {
  currentAppSpecJson?: string
  existingAppSpecModelSummary?: string
  mode: GenerationMode
  prompt: string
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

const readGenerationMode = (data: unknown): GenerationMode => {
  if (!isRecord(data) || data.mode === undefined || data.mode === 'create') {
    return 'create'
  }

  if (data.mode === 'improve') {
    return 'improve'
  }

  throw new HttpsError('invalid-argument', 'Generation mode must be create or improve.')
}

const shortText = (value: unknown, maxLength = 180) => {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength).trim()}...`
}

const shortStringArray = (value: unknown, maxItems = 24) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => shortText(item, 80))
        .filter((item): item is string => Boolean(item))
        .slice(0, maxItems)
    : undefined

const shortOptions = (value: unknown, maxItems = 16) =>
  Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((option) => ({
          id: shortText(option.id, 80),
          label: shortText(option.label, 80),
          value: shortText(option.value, 80),
        }))
        .slice(0, maxItems)
    : undefined

const shortFields = (value: unknown, maxItems = 12) =>
  Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((field) => ({
          id: shortText(field.id, 80),
          inputType: shortText(field.inputType, 32),
          label: shortText(field.label, 100),
          options: shortOptions(field.options, 12),
          placeholder: shortText(field.placeholder, 100),
        }))
        .slice(0, maxItems)
    : undefined

const compactBlockForModel = (block: unknown) => {
  if (!isRecord(block)) {
    return block
  }

  const compactBlock: Record<string, unknown> = {
    id: shortText(block.id, 80),
    type: shortText(block.type, 40),
    label: shortText(block.label, 100),
    helpText: shortText(block.helpText, 180),
  }

  switch (block.type) {
    case 'heading':
      compactBlock.text = shortText(block.text, 140)
      compactBlock.level = block.level
      break
    case 'paragraph':
      compactBlock.text = shortText(block.text, 260)
      break
    case 'textInput':
    case 'numberInput':
    case 'textarea':
      compactBlock.placeholder = shortText(block.placeholder, 120)
      compactBlock.defaultValue = block.defaultValue
      compactBlock.unit = shortText(block.unit, 40)
      break
    case 'select':
      compactBlock.options = shortOptions(block.options)
      compactBlock.defaultValue = shortText(block.defaultValue, 80)
      break
    case 'checkbox':
      compactBlock.text = shortText(block.text, 140)
      compactBlock.defaultValue = block.defaultValue
      break
    case 'checkboxList':
      compactBlock.items = Array.isArray(block.items)
        ? block.items
            .filter(isRecord)
            .map((item) => ({
              id: shortText(item.id, 80),
              label: shortText(item.label, 100),
            }))
            .slice(0, 28)
        : undefined
      break
    case 'button':
      compactBlock.text = shortText(block.text, 100)
      compactBlock.action = block.action
      break
    case 'computedValue':
      compactBlock.operation = block.operation
      compactBlock.precision = block.precision
      compactBlock.resultLabel = shortText(block.resultLabel, 100)
      break
    case 'savedEntryList':
      compactBlock.storeId = shortText(block.storeId, 80)
      compactBlock.fields = shortFields(block.fields)
      compactBlock.submitLabel = shortText(block.submitLabel, 100)
      compactBlock.emptyText = shortText(block.emptyText, 140)
      break
    case 'listEditor':
      compactBlock.placeholder = shortText(block.placeholder, 120)
      compactBlock.addLabel = shortText(block.addLabel, 80)
      compactBlock.defaultItems = shortStringArray(block.defaultItems)
      break
    case 'randomizer':
      compactBlock.sourceBlockIds = shortStringArray(block.sourceBlockIds)
      compactBlock.buttonLabel = shortText(block.buttonLabel, 100)
      compactBlock.resultLabel = shortText(block.resultLabel, 100)
      break
    case 'simpleTable':
      compactBlock.storeId = shortText(block.storeId, 80)
      compactBlock.columns = Array.isArray(block.columns)
        ? block.columns
            .filter(isRecord)
            .map((column) => ({
              fieldId: shortText(column.fieldId, 80),
              label: shortText(column.label, 100),
            }))
            .slice(0, 12)
        : undefined
      compactBlock.emptyText = shortText(block.emptyText, 140)
      break
  }

  return Object.fromEntries(
    Object.entries(compactBlock).filter(([, value]) => value !== undefined),
  )
}

const compactAppSpecForModel = (appSpec: Record<string, unknown>) => ({
  category: appSpec.category,
  createdAt: appSpec.createdAt,
  dataStores: Array.isArray(appSpec.dataStores)
    ? appSpec.dataStores.filter(isRecord).map((store) => ({
        id: shortText(store.id, 80),
        name: shortText(store.name, 100),
        type: store.type,
      }))
    : [],
  description: shortText(appSpec.description, 260),
  icon: appSpec.icon,
  id: appSpec.id,
  name: shortText(appSpec.name, 120),
  screens: Array.isArray(appSpec.screens)
    ? appSpec.screens.filter(isRecord).map((screen) => ({
        blocks: Array.isArray(screen.blocks)
          ? screen.blocks.map(compactBlockForModel)
          : [],
        description: shortText(screen.description, 180),
        id: shortText(screen.id, 80),
        title: shortText(screen.title, 100),
      }))
    : [],
  updatedAt: appSpec.updatedAt,
  version: appSpec.version,
})

const outlineAppSpecForModel = (appSpec: Record<string, unknown>) => ({
  category: appSpec.category,
  createdAt: appSpec.createdAt,
  dataStores: Array.isArray(appSpec.dataStores)
    ? appSpec.dataStores.filter(isRecord).map((store) => ({
        id: shortText(store.id, 80),
        name: shortText(store.name, 100),
        type: store.type,
      }))
    : [],
  description: shortText(appSpec.description, 180),
  id: appSpec.id,
  name: shortText(appSpec.name, 120),
  screens: Array.isArray(appSpec.screens)
    ? appSpec.screens.filter(isRecord).map((screen) => ({
        blockOutline: Array.isArray(screen.blocks)
          ? screen.blocks.filter(isRecord).map((block) => ({
              id: shortText(block.id, 80),
              label: shortText(block.label, 80),
              storeId: shortText(block.storeId, 80),
              type: shortText(block.type, 40),
            }))
          : [],
        id: shortText(screen.id, 80),
        title: shortText(screen.title, 100),
      }))
    : [],
  version: appSpec.version,
})

const currentAppSpecJsonForModel = (currentAppSpec: Record<string, unknown>) => {
  const compactJson = JSON.stringify(compactAppSpecForModel(currentAppSpec))

  if (compactJson.length <= maxCurrentAppSpecJsonLength) {
    return {
      json: compactJson,
      warning:
        JSON.stringify(currentAppSpec).length > maxCurrentAppSpecJsonLength
          ? 'Large current AppSpec was compacted before improvement to stay within test-phase AI limits.'
          : undefined,
    }
  }

  return {
    json: JSON.stringify(outlineAppSpecForModel(currentAppSpec)),
    warning:
      'Very large current AppSpec was summarized as an outline before improvement to stay within test-phase AI limits.',
  }
}

const readCurrentAppSpecContext = (
  data: unknown,
  mode: GenerationMode,
): CurrentAppSpecContext | undefined => {
  if (mode !== 'improve') {
    return undefined
  }

  if (!isRecord(data) || !isRecord(data.currentAppSpec)) {
    throw new HttpsError(
      'invalid-argument',
      'Improvement requests must include the current AppSpec.',
    )
  }

  const currentAppSpec = data.currentAppSpec

  if (
    typeof currentAppSpec.id !== 'string' ||
    typeof currentAppSpec.createdAt !== 'string'
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Current AppSpec must include id and createdAt.',
    )
  }

  const version =
    typeof currentAppSpec.version === 'number' &&
    Number.isFinite(currentAppSpec.version)
      ? Math.max(1, Math.floor(currentAppSpec.version))
      : 1
  const { json, warning } = currentAppSpecJsonForModel(currentAppSpec)

  if (json.length > maxCurrentAppSpecJsonLength) {
    throw new HttpsError(
      'invalid-argument',
      'Current AppSpec is too large to improve safely even after summarizing it.',
    )
  }

  return {
    json,
    preserveMetadata: {
      createdAt: currentAppSpec.createdAt,
      id: currentAppSpec.id,
      version,
    },
    warning,
  }
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

const messageFromError = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

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

interface ParsedModelOutput {
  value: unknown
  warning?: string
}

const fencedJsonPattern = /^```(?:json)?\s*([\s\S]*?)\s*```$/i

const stripCodeFence = (value: string) => {
  const match = value.trim().match(fencedJsonPattern)
  return match?.[1]?.trim() ?? value.trim()
}

const extractJsonObject = (value: string) => {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return value
  }

  return value.slice(start, end + 1)
}

const withoutTrailingCommas = (value: string) =>
  value.replace(/,\s*(?=[}\]])/g, '')

const parseModelOutput = (outputText: string): ParsedModelOutput => {
  const trimmed = outputText.trim()
  const fenced = stripCodeFence(trimmed)
  const extracted = extractJsonObject(fenced)
  const candidates = [
    { label: 'raw', value: trimmed },
    { label: 'fenced', value: fenced },
    { label: 'extracted', value: extracted },
    {
      label: 'trailing-comma-cleaned',
      value: withoutTrailingCommas(extracted),
    },
  ]

  let lastParseError = 'Unknown JSON parse error.'
  const seenCandidates = new Set<string>()

  for (const candidate of candidates) {
    if (!candidate.value || seenCandidates.has(candidate.value)) {
      continue
    }

    seenCandidates.add(candidate.value)

    try {
      return {
        value: JSON.parse(candidate.value),
        warning:
          candidate.label === 'raw'
            ? undefined
            : 'Cleaned minor JSON formatting from the AI response before saving.',
      }
    } catch (error) {
      lastParseError = messageFromError(error)
    }
  }

  throw new HttpsError(
    'internal',
    'AI returned malformed JSON. AppForge retried safely; use the local fallback or try again.',
    {
      reason: 'malformed_json',
      parseError: lastParseError,
    },
  )
}

const outputTextFrom = (response: unknown) => {
  const outputText = (response as { output_text?: string }).output_text

  if (!outputText) {
    throw new Error('OpenAI response did not include output_text.')
  }

  return outputText
}

const requestModelOutput = async (
  client: OpenAI,
  model: string,
  context: ModelRequestContext,
  retryMalformedJson: boolean,
) => {
  const retryInstruction = retryMalformedJson
    ? '\n\nThe previous output was malformed JSON. Return only valid JSON with double-quoted property names, no comments, no markdown, and no trailing commas.'
    : ''

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
        content: `${buildGenerateAppSpecInput(context)}${retryInstruction}`,
      },
    ],
    max_output_tokens: maxOutputTokens,
    temperature: 0.2,
    text: {
      format: {
        type: 'json_schema',
        name: 'appforge_generation',
        strict: true,
        schema: appForgeGenerationJsonSchema,
      },
    },
  })

  return outputTextFrom(response)
}

const parsedModelOutputFrom = async (
  client: OpenAI,
  model: string,
  context: ModelRequestContext,
): Promise<ParsedModelOutput> => {
  const firstOutput = await requestModelOutput(
    client,
    model,
    context,
    false,
  )

  try {
    return parseModelOutput(firstOutput)
  } catch (error) {
    if (!(error instanceof HttpsError)) {
      throw error
    }

    logger.warn('OpenAI returned malformed JSON; retrying once.', {
      message: error.message,
    })
  }

  const retryOutput = await requestModelOutput(
    client,
    model,
    context,
    true,
  )
  const parsedRetryOutput = parseModelOutput(retryOutput)

  return {
    value: parsedRetryOutput.value,
    warning:
      parsedRetryOutput.warning ??
      'Retried AI generation because the first response was malformed JSON.',
  }
}

const generateAppSpecResponseFrom = async (
  data: GenerateAppSpecRequest | unknown,
  requestSource: RequestSource,
): Promise<GenerateAppSpecResponse> => {
  const prompt = readPrompt(data)
  const existingAppSpecModelSummary = readModelSummary(data)
  const mode = readGenerationMode(data)
  const currentAppSpecContext = readCurrentAppSpecContext(data, mode)
  const model = process.env.OPENAI_MODEL || defaultModel
  enforceRateLimit(clientKeyFrom(requestSource))

  const client = new OpenAI({ apiKey: openAiApiKey.value() })

  logger.info('Generating AppForge AppSpec with OpenAI.', {
    model,
    maxOutputTokens,
    mode,
    promptLength: prompt.length,
  })

  const parsed = await parsedModelOutputFrom(
    client,
    model,
    {
      currentAppSpecJson: currentAppSpecContext?.json,
      existingAppSpecModelSummary,
      mode,
      prompt,
    },
  )

  if (!isRecord(parsed.value) || !('appSpec' in parsed.value)) {
    throw new Error('OpenAI response did not include appSpec.')
  }

  const sanitized = sanitizeAppSpec(parsed.value.appSpec, {
    preserveMetadata: currentAppSpecContext?.preserveMetadata,
  })
  const warnings = [
    `Test-phase guardrails active: ${model}, ${maxOutputTokens} max output tokens, ${maxRequestsPerHourPerClient} requests per hour per client.`,
    ...(currentAppSpecContext?.warning ? [currentAppSpecContext.warning] : []),
    ...(parsed.warning ? [parsed.warning] : []),
    ...modelWarningsFrom(parsed.value.warnings),
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
