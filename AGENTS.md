# AppForge Project Instructions

AppForge is an AI-powered app studio and mini-app library.

The core idea: the user describes an app idea in free text, AppForge helps refine the idea, generates a structured app specification, saves it to the user's library, and renders it as a working mini-app inside AppForge.

AppForge is one installable container app. The generated apps are not separate native iOS apps at first. They are AI-generated mini-app specifications rendered dynamically inside AppForge. Later, selected apps may be exportable as standalone PWAs or native projects.

## Product Vision

The user experience should feel like this:

1. User describes an app idea in natural language.
2. AppForge asks clarifying questions when needed.
3. AppForge generates a draft app design.
4. User reviews or edits the draft.
5. AppForge creates a working mini-app.
6. The mini-app appears in the library.
7. The user can open and use it immediately.
8. Later, the user may export, publish, or install selected apps separately.

AppForge should not feel like a rigid template picker.

Templates may exist internally as examples or fallback scaffolds, but the primary creation mode is AI-driven free-text app generation.

## Current MVP Goal

Build a local-first MVP that supports:

- Mobile-first app shell
- App header with name: AppForge
- Bottom navigation with Create, Library, and Settings
- Free-text app idea input
- AI-style refinement flow
- Draft app spec generation
- Review screen for generated app spec
- Save generated mini-app to library
- Dynamic rendering of saved mini-apps
- localStorage persistence
- TypeScript types for app specs
- A safe deterministic mock generator for now
- No real OpenAI API yet
- No Claude API yet
- No Firebase yet
- No authentication yet
- No backend yet
- No routing library yet
- No vite-plugin-pwa yet

## Important MVP Constraint

Do not build AppForge as a cookie-cutter calculator/checklist/tracker template app.

The MVP should start from free text.

The user should be able to type something like:

"Make me an app to plan outfits while deployed. It should randomize shirt and pants combinations, avoid repeats, and let me mark what I wore."

Then AppForge should generate a usable mini-app spec and render it.

For the MVP, the generation can be deterministic and local, but the UI and architecture should be designed for a future real AI backend.

## Technical Stack

Use:

- React
- TypeScript
- Vite
- Plain CSS for now
- localStorage for persistence

Do not add unless explicitly requested:

- Firebase
- Firestore
- Firebase Auth
- Backend APIs
- OpenAI API
- Claude API
- Native iOS code
- App Store/TestFlight workflows
- Routing libraries
- State management libraries
- vite-plugin-pwa

Important: Do not use `vite-plugin-pwa` right now. The current project uses Vite 8, and `vite-plugin-pwa` has a peer dependency conflict with Vite 8.

## Core Architecture

The app should be organized around this pipeline:

Free-text app idea
→ refinement questions
→ generated app spec
→ review/edit screen
→ save to library
→ dynamic renderer

The generated app should be represented as structured JSON-like data, not arbitrary generated React source code.

This allows AppForge to safely render many kinds of apps inside one container.

## App Spec Model

Create a flexible AppSpec model.

An app spec should include:

- id
- name
- description
- category
- icon or emoji
- createdAt
- updatedAt
- version
- dataStores
- screens

Each screen should include:

- id
- title
- description
- blocks

Each block should be a discriminated union.

Initial block types should include:

- heading
- paragraph
- textInput
- numberInput
- textarea
- select
- checkbox
- checkboxList
- button
- computedValue
- savedEntryList
- listEditor
- randomizer
- simpleTable

The renderer should be block-driven and screen-driven.

Avoid hard-coding the app around only calculators or checklists.

## Data Stores

Generated mini-apps should be able to define simple internal data stores.

Examples:

- saved entries
- checklist state
- list items
- history logs
- user-defined options
- randomizer source lists

For MVP, persist each generated app's runtime data in localStorage.

Use clear keys based on app id.

## Generation Strategy for MVP

For the first MVP, build a deterministic mock generator that turns free text into an AppSpec.

It does not need to be perfect.

It should detect common intents and generate useful app specs for prompts involving:

- calculators
- packing lists
- outfit planners
- workout logs
- habit trackers
- decision guides
- reference guides
- study tools
- journal/log apps
- randomizers

If intent detection is uncertain, generate a generic app with:

- a heading
- description
- notes section
- saved entry list
- basic input form

The important part is not perfect generation. The important part is the end-to-end flow:

Prompt → generated spec → review → save → render → use.

## Future Real AI Backend

The architecture should make it easy to replace the deterministic mock generator with a real AI call later.

Future AI generation should return strict JSON matching the AppSpec schema.

Do not implement the real API yet.

Do not put API keys in the frontend.

When the real AI backend is added later, it should likely use a serverless function or backend endpoint to protect API keys.

## Create Flow

The Create screen should center on a free-text prompt.

Suggested flow:

1. App idea text area
2. Button: Generate App
3. Optional refinement questions or assumptions
4. Generated draft app preview
5. Save to Library
6. Open App

The prompt field should support examples like:

- "Make me an app to randomize deployed work outfits and track what I wore."
- "Make me an app to log workouts and show recent PRs."
- "Make me an app to calculate run pace from distance and time."
- "Make me an app to plan a packing list for short trips."
- "Make me an app to help decide whether a project idea is worth building."
- "Make me a simple study flashcard app for ML concepts."
- "Make me an app to track restaurants I want to try."

## Library

The Library screen should show saved generated apps as cards.

Each card should show:

- icon or emoji
- name
- description
- category
- updated date

Actions:

- Open
- Duplicate if easy
- Delete with confirmation

## Renderer

The dynamic renderer should:

- Render screens from the AppSpec
- Render blocks based on block type
- Persist runtime user values per generated app
- Handle invalid or missing block data gracefully
- Avoid crashing the whole app if one block is malformed
- Show useful fallback UI for unsupported block types

## Computed Values

Computed or formula-like blocks should be safe.

Do not use JavaScript `eval`.

For MVP, support a limited set of operations such as:

- add
- subtract
- multiply
- divide
- concat
- countChecked
- randomChoice
- basic pace calculation if implemented explicitly

Use explicit operation objects rather than arbitrary code strings.

Example:

```json
{
  "type": "computedValue",
  "id": "sum",
  "label": "Sum",
  "operation": {
    "type": "add",
    "inputIds": ["a", "b"]
  }
}'''

UI Principles

Design for iPhone first.

Prioritize:

* Free-text creation
* Clear generated draft preview
* Fast save/open flow
* Large readable text
* Clear touch targets
* Bottom tab navigation
* Card-based library
* Simple app detail pages
* Comfortable spacing
* Clean empty states
* Minimal visual clutter

Avoid:

* Rigid template-only creation
* Dense desktop-first layouts
* Tiny buttons
* Excessive animation
* Overly clever abstractions
* Complex nested menus in the MVP

Code Quality Rules

Favor clear, readable code over clever code.

Use TypeScript types explicitly.

Keep components small and purposeful.

Keep app spec types in a dedicated file.

Keep mock generation logic in a dedicated file.

Keep localStorage helpers in a dedicated file.

Keep dynamic rendering in dedicated renderer components.

Use simple state-based navigation for the MVP.

Run npm run build after meaningful changes and fix TypeScript/build errors.

Suggested File Organization

A reasonable structure:
src/
  App.tsx
  main.tsx
  styles.css
  types/
    appSpec.ts
  generation/
    mockAppGenerator.ts
  storage/
    appStorage.ts
  components/
    AppShell.tsx
    BottomNav.tsx
    AppHeader.tsx
    CreateScreen.tsx
    LibraryScreen.tsx
    SettingsScreen.tsx
    GeneratedAppReview.tsx
    AppCard.tsx
  renderer/
    AppRenderer.tsx
    ScreenRenderer.tsx
    BlockRenderer.tsx
    blockRenderers/
      InputBlocks.tsx
      DisplayBlocks.tsx
      ActionBlocks.tsx
      DataBlocks.tsx

This exact structure is not mandatory, but keep similar separation of concerns.

Workflow Rules for Codex

Before large edits:

1. Inspect the current repo.
2. Explain the implementation plan.
3. List files expected to change.
4. Wait for approval if the requested change is broad.

When implementing:

* Keep diffs small and reversible.
* Do not run destructive commands.
* Do not delete unrelated files.
* Do not modify package dependencies unless necessary.
* Do not add major libraries without explaining why.
* Do not change the product into a rigid template picker.
* Do not add a real AI API until explicitly requested.

After implementing:

1. Run npm run build.
2. Fix build errors.
3. Summarize files changed.
4. Explain how to test the feature manually.

Current Development Phase

Phase 1: Local-only AI-style AppForge MVP.

Build:

* App shell
* Free-text creation flow
* Deterministic mock app generator
* Generated app review screen
* Library
* Dynamic app renderer
* localStorage persistence
* Settings/reset screen

Do not build yet:

* Real OpenAI/Claude API integration
* Firebase sync
* Authentication
* Cloud library
* Sharing
* Standalone app export
* Native iOS wrapper
* TestFlight
* App Store deployment

Future Phases

Future Phase 2: Manual PWA metadata and deployability.

Future Phase 3: Real AI backend that generates strict AppSpec JSON.

Future Phase 4: App editing/refinement after generation.

Future Phase 5: Firebase Auth and Firestore sync.

Future Phase 6: Offline-first polish and import/export.

Future Phase 7: Export selected mini-apps as standalone PWAs.

Future Phase 8: Native iOS container app, if the PWA proves useful.

North Star

AppForge should make it easy to go from:

“I have an idea for a small personal utility app”

to:

“I described it, AppForge generated it, it is saved in my library, and I can use it on my iPhone.”

The MVP may use a mock generator, but the product should feel like an AI app creator from day one.