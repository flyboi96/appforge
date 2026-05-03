import { useState, type FormEvent } from 'react'
import { improveAppSpecWithAI } from '../generation/generateAppSpecWithAI'
import { improveMockAppSpec } from '../generation/mockAppImprover'
import type { AppSpec, GeneratedAppDraft } from '../types/appSpec'
import { displayIconForApp } from '../utils/appIcon'

interface ImproveAppScreenProps {
  appSpec: AppSpec
  onBack: () => void
  onDraftGenerated: (draft: GeneratedAppDraft) => void
}

const exampleImprovements = [
  'Add a history screen so I can review saved entries over time.',
  'Make this better for quick notes and follow-up actions.',
  'Add a randomizer so it can suggest what to do next.',
  'Make the labels more specific and useful for my workflow.',
]

export function ImproveAppScreen({
  appSpec,
  onBack,
  onDraftGenerated,
}: ImproveAppScreenProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationWarning, setGenerationWarning] = useState<string | null>(null)
  const [fallbackPrompt, setFallbackPrompt] = useState<string | null>(null)

  const generateImprovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) {
      return
    }

    setIsGenerating(true)
    setGenerationWarning(null)
    setFallbackPrompt(null)

    try {
      onDraftGenerated(await improveAppSpecWithAI(trimmedPrompt, appSpec))
    } catch (error) {
      setFallbackPrompt(trimmedPrompt)
      setGenerationWarning(
        error instanceof Error
          ? error.message
          : 'AI improvement failed. You can use the local mock improver instead.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const generateLocalFallback = () => {
    if (!fallbackPrompt) {
      return
    }

    onDraftGenerated(
      improveMockAppSpec(appSpec, fallbackPrompt, generationWarning ?? undefined),
    )
  }

  return (
    <section className="screen-stack create-flow">
      <button type="button" className="back-button" onClick={onBack}>
        Back to App
      </button>

      <header className="detail-header">
        <span className="detail-icon" aria-hidden="true">
          {displayIconForApp(appSpec)}
        </span>
        <div>
          <p className="eyebrow">Improve app</p>
          <h2>{appSpec.name}</h2>
          <p>Describe what would make this mini-app more useful for you.</p>
        </div>
      </header>

      <form className="panel prompt-form" onSubmit={generateImprovement}>
        <label className="field-block">
          <span>Improvement idea</span>
          <textarea
            value={prompt}
            rows={6}
            placeholder="Add a history screen, make the labels more specific, and include a notes area for follow-ups."
            onChange={(event) => {
              setPrompt(event.target.value)
              setGenerationWarning(null)
              setFallbackPrompt(null)
            }}
          />
        </label>
        <button type="submit" className="primary-button" disabled={isGenerating}>
          {isGenerating ? 'Improving with AI...' : 'Improve App'}
        </button>
        {isGenerating ? (
          <p className="ai-generation-indicator">Using real AI through Firebase</p>
        ) : null}
      </form>

      {generationWarning ? (
        <section className="panel generation-warning">
          <h3>AI improvement unavailable</h3>
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

      <section className="example-list" aria-label="Example improvements">
        <h3>Try an improvement</h3>
        {exampleImprovements.map((example) => (
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
