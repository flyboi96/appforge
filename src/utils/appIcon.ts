import type { AppSpec } from '../types/appSpec'

const fallbackIconsByCategory: Record<AppSpec['category'], string> = {
  calculator: '🧮',
  checklist: '✅',
  tracker: '📓',
  planner: '🗓',
  routine: '🔁',
  reference: '📚',
  study: '🧠',
  restaurant: '🍽',
  decision: '🧭',
  custom: '✨',
}

const emojiPattern = /\p{Extended_Pictographic}/u

export const displayIconForApp = (
  appSpec: Pick<AppSpec, 'category' | 'icon'>,
) => {
  const rawIcon = appSpec.icon.trim()

  for (const character of Array.from(rawIcon)) {
    if (emojiPattern.test(character)) {
      return character
    }
  }

  return fallbackIconsByCategory[appSpec.category] ?? fallbackIconsByCategory.custom
}
