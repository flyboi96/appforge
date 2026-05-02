import OpenAI from 'openai'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { appForgeGenerationJsonSchema } from './appSpecJsonSchema'
import { buildGenerateAppSpecInput } from './generateAppSpecPrompt'
import { sanitizeAppSpec } from './sanitizeAppSpec'
import type {
  GenerateAppSpecRequest,
  GenerateAppSpecResponse,
} from './appSpecTypes'

const openAiApiKey = defineSecret('OPENAI_API_KEY')
const maxPromptLength = 2000
const maxModelSummaryLength = 4000
const defaultModel = 'gpt-5.4-mini'

const allowedOrigins = [
  'https://flyboi96.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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

export const generateAppSpec = onCall<GenerateAppSpecRequest>(
  {
    cors: allowedOrigins,
    memory: '512MiB',
    region: 'us-central1',
    secrets: [openAiApiKey],
    timeoutSeconds: 60,
  },
  async (request): Promise<GenerateAppSpecResponse> => {
    try {
      const prompt = readPrompt(request.data)
      const existingAppSpecModelSummary = readModelSummary(request.data)
      const client = new OpenAI({ apiKey: openAiApiKey.value() })

      logger.info('Generating AppForge AppSpec with OpenAI.', {
        promptLength: prompt.length,
      })

      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || defaultModel,
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
        max_output_tokens: 6000,
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
        ...modelWarningsFrom(parsed.warnings),
        ...sanitized.warnings,
      ].slice(0, 12)

      return {
        appSpec: sanitized.appSpec,
        warnings,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('generateAppSpec failed.', {
        message: error instanceof Error ? error.message : String(error),
      })

      throw new HttpsError(
        'internal',
        'AI app generation failed. You can retry or use the local mock fallback.',
      )
    }
  },
)
