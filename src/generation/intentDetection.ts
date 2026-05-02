export type AppIntent =
  | 'outfit'
  | 'workout'
  | 'packing'
  | 'pace'
  | 'decision'
  | 'reference'
  | 'study'
  | 'restaurant'
  | 'calculator'
  | 'checklist'
  | 'generic'

const hasAny = (prompt: string, words: string[]) =>
  words.some((word) => prompt.includes(word))

export const detectIntent = (prompt: string): AppIntent => {
  const normalized = prompt.toLowerCase()

  if (hasAny(normalized, ['outfit', 'shirt', 'pants', 'clothes', 'wardrobe'])) {
    return 'outfit'
  }

  if (hasAny(normalized, ['workout', 'exercise', 'gym', 'lift', 'pr '])) {
    return 'workout'
  }

  if (hasAny(normalized, ['packing', 'pack ', 'trip', 'travel', 'luggage'])) {
    return 'packing'
  }

  if (hasAny(normalized, ['pace', 'run ', 'running', 'distance', 'mile'])) {
    return 'pace'
  }

  if (hasAny(normalized, ['decision', 'decide', 'choose', 'worth building'])) {
    return 'decision'
  }

  if (hasAny(normalized, ['reference', 'guide', 'manual', 'lookup'])) {
    return 'reference'
  }

  if (hasAny(normalized, ['flashcard', 'study', 'quiz', 'learn'])) {
    return 'study'
  }

  if (hasAny(normalized, ['restaurant', 'food', 'places to eat', 'cuisine'])) {
    return 'restaurant'
  }

  if (hasAny(normalized, ['calculator', 'calculate', 'sum', 'total'])) {
    return 'calculator'
  }

  if (hasAny(normalized, ['checklist', 'todo', 'to do', 'tasks'])) {
    return 'checklist'
  }

  return 'generic'
}
