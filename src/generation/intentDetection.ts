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

  if (
    hasAny(normalized, [
      'outfit',
      'shirt',
      'pants',
      'clothes',
      'wardrobe',
      'uniform',
      'shoes',
    ])
  ) {
    return 'outfit'
  }

  if (
    hasAny(normalized, [
      'workout',
      'exercise',
      'gym',
      'lift',
      'training',
      'sets',
      'reps',
      'pr ',
      'personal record',
    ])
  ) {
    return 'workout'
  }

  if (
    hasAny(normalized, [
      'packing',
      'pack ',
      'trip',
      'travel',
      'luggage',
      'carry-on',
      'carry on',
    ])
  ) {
    return 'packing'
  }

  if (
    hasAny(normalized, [
      'pace',
      'run ',
      'running',
      'distance',
      'mile',
      'kilometer',
      'km',
      '5k',
      'marathon',
    ])
  ) {
    return 'pace'
  }

  if (
    hasAny(normalized, [
      'decision',
      'decide',
      'choose',
      'compare',
      'choice',
      'tradeoff',
      'worth building',
    ])
  ) {
    return 'decision'
  }

  if (hasAny(normalized, ['reference', 'guide', 'manual', 'lookup', 'notes database'])) {
    return 'reference'
  }

  if (hasAny(normalized, ['flashcard', 'flash card', 'study', 'quiz', 'learn'])) {
    return 'study'
  }

  if (
    hasAny(normalized, [
      'restaurant',
      'food',
      'places to eat',
      'cuisine',
      'dinner',
      'cafe',
    ])
  ) {
    return 'restaurant'
  }

  if (
    hasAny(normalized, [
      'calculator',
      'calculate',
      'sum',
      'total',
      'estimate',
      'converter',
    ])
  ) {
    return 'calculator'
  }

  if (hasAny(normalized, ['checklist', 'todo', 'to do', 'tasks', 'task list'])) {
    return 'checklist'
  }

  return 'generic'
}
