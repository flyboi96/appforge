import { useState, type FormEvent } from 'react'
import { generateAppSpecWithAI } from '../generation/generateAppSpecWithAI'
import { generateMockAppSpec } from '../generation/mockAppGenerator'
import type { GeneratedAppDraft } from '../types/appSpec'

interface CreateScreenProps {
  onDraftGenerated: (draft: GeneratedAppDraft) => void
}

const examplePrompts = [
  'Make me an app to randomize deployed work outfits and track what I wore.',
  'Make me an app to log workouts and show recent PRs.',
  'Make me an app to calculate run pace from distance and time.',
  'Make me an app to plan a packing list for short trips.',
  'Make me an app to track restaurants I want to try.',
]

export function CreateScreen({ onDraftGenerated }: CreateScreenProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationWarning, setGenerationWarning] = useState<string | null>(null)
  const [fallbackPrompt, setFallbackPrompt] = useState<string | null>(null)

  const generateDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) {
      return
    }

    setIsGenerating(true)
    setGenerationWarning(null)
    setFallbackPrompt(null)

    try {
      onDraftGenerated(await generateAppSpecWithAI(trimmedPrompt))
    } catch (error) {
      setFallbackPrompt(trimmedPrompt)
      setGenerationWarning(
        error instanceof Error
          ? error.message
          : 'AI generation failed. You can use the local mock generator instead.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const generateLocalFallback = () => {
    if (!fallbackPrompt) {
      return
    }

    const localDraft = generateMockAppSpec(fallbackPrompt)
    const draft: GeneratedAppDraft = {
      ...localDraft,
      assumptions: [
        'AI generation failed, so this draft was generated locally with the deterministic mock generator.',
        ...localDraft.assumptions,
      ],
      warnings: generationWarning ? [generationWarning] : [],
    }

    onDraftGenerated(draft)
  }

  return (
    <section className="screen-stack create-flow">
      <div className="screen-heading">
        <p className="eyebrow">Create</p>
        <h2>Describe the app you want</h2>
        <p>
          AppForge will try real AI generation through Firebase first, then keep
          the local mock generator available as a fallback.
        </p>
      </div>

      <form className="panel prompt-form" onSubmit={generateDraft}>
        <label className="field-block">
          <span>App idea</span>
          <textarea
            value={prompt}
            rows={6}
            placeholder="Make me an app to plan outfits, randomize combinations, and log what I wore."
            onChange={(event) => {
              setPrompt(event.target.value)
              setGenerationWarning(null)
              setFallbackPrompt(null)
            }}
          />
        </label>
        <button type="submit" className="primary-button" disabled={isGenerating}>
          {isGenerating ? 'Generating with AI...' : 'Generate App'}
        </button>
        {isGenerating ? (
          <p className="ai-generation-indicator">Using real AI through Firebase</p>
        ) : null}
      </form>

      {generationWarning ? (
        <section className="panel generation-warning">
          <h3>AI generation unavailable</h3>
          <p>{generationWarning}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={generateLocalFallback}
          >
            Use Local Fallback
          </button>
        </section>
      ) : null}

      <section className="example-list" aria-label="Example prompts">
        <h3>Try a prompt</h3>
        {examplePrompts.map((example) => (
          <button
            key={example}
            type="button"
            className="example-prompt"
            onClick={() => {
              setPrompt(example)
              setGenerationWarning(null)
              setFallbackPrompt(null)
            }}
          >
            {example}
          </button>
        ))}
      </section>
    </section>
  )
}
