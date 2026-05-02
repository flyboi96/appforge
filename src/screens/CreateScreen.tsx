import { useState, type FormEvent } from 'react'
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

  const generateDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) {
      return
    }

    onDraftGenerated(generateMockAppSpec(trimmedPrompt))
  }

  return (
    <section className="screen-stack create-flow">
      <div className="screen-heading">
        <p className="eyebrow">Create</p>
        <h2>Describe the app you want</h2>
        <p>
          AppForge will generate a local draft spec with screens, blocks, and
          storage. The generator is mocked for now.
        </p>
      </div>

      <form className="panel prompt-form" onSubmit={generateDraft}>
        <label className="field-block">
          <span>App idea</span>
          <textarea
            value={prompt}
            rows={6}
            placeholder="Make me an app to plan outfits, randomize combinations, and log what I wore."
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <button type="submit" className="primary-button">
          Generate App
        </button>
      </form>

      <section className="example-list" aria-label="Example prompts">
        <h3>Try a prompt</h3>
        {examplePrompts.map((example) => (
          <button
            key={example}
            type="button"
            className="example-prompt"
            onClick={() => setPrompt(example)}
          >
            {example}
          </button>
        ))}
      </section>
    </section>
  )
}
