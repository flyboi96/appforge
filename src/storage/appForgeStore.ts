import type { AppForgeData, AppRuntimeState } from '../types/appSpec'

const STORAGE_KEY = 'appforge:data:v2'

export const emptyRuntimeState = (): AppRuntimeState => ({
  valuesByBlockId: {},
  dataByStoreId: {},
})

export const emptyAppForgeData = (): AppForgeData => ({
  appSpecs: [],
  runtimeByAppId: {},
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const loadAppForgeData = (): AppForgeData => {
  if (typeof window === 'undefined') {
    return emptyAppForgeData()
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return emptyAppForgeData()
  }

  try {
    const parsed: unknown = JSON.parse(stored)

    if (!isRecord(parsed) || !Array.isArray(parsed.appSpecs)) {
      return emptyAppForgeData()
    }

    return {
      appSpecs: parsed.appSpecs as AppForgeData['appSpecs'],
      runtimeByAppId: isRecord(parsed.runtimeByAppId)
        ? (parsed.runtimeByAppId as AppForgeData['runtimeByAppId'])
        : {},
    }
  } catch {
    return emptyAppForgeData()
  }
}

export const saveAppForgeData = (data: AppForgeData) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const resetAppForgeData = () => {
  window.localStorage.removeItem(STORAGE_KEY)
}
