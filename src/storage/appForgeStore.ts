import type {
  AppForgeData,
  AppRuntimeState,
  AppSpec,
  RuntimeValue,
  StoredRecord,
  StoredValue,
} from '../types/appSpec'

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

const isAppSpec = (value: unknown): value is AppSpec =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.description === 'string' &&
  typeof value.category === 'string' &&
  typeof value.icon === 'string' &&
  Array.isArray(value.dataStores) &&
  Array.isArray(value.screens)

const isRuntimeValue = (value: unknown): value is RuntimeValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'))

const isStoredValue = (value: unknown): value is StoredValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'

const isStoredRecord = (value: unknown): value is StoredRecord =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.createdAt === 'string' &&
  isRecord(value.values) &&
  Object.values(value.values).every(isStoredValue)

const normalizeRuntimeState = (value: unknown): AppRuntimeState => {
  if (!isRecord(value)) {
    return emptyRuntimeState()
  }

  const valuesByBlockId = isRecord(value.valuesByBlockId)
    ? Object.entries(value.valuesByBlockId).reduce<Record<string, RuntimeValue>>(
        (nextValues, [blockId, runtimeValue]) => {
          if (isRuntimeValue(runtimeValue)) {
            nextValues[blockId] = runtimeValue
          }

          return nextValues
        },
        {},
      )
    : {}

  const dataByStoreId = isRecord(value.dataByStoreId)
    ? Object.entries(value.dataByStoreId).reduce<Record<string, StoredRecord[]>>(
        (nextStores, [storeId, records]) => {
          if (Array.isArray(records)) {
            nextStores[storeId] = records.filter(isStoredRecord)
          }

          return nextStores
        },
        {},
      )
    : {}

  return {
    valuesByBlockId,
    dataByStoreId,
  }
}

export const loadAppForgeData = (): AppForgeData => {
  if (typeof window === 'undefined') {
    return emptyAppForgeData()
  }

  let stored: string | null

  try {
    stored = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyAppForgeData()
  }

  if (!stored) {
    return emptyAppForgeData()
  }

  try {
    const parsed: unknown = JSON.parse(stored)

    if (!isRecord(parsed) || !Array.isArray(parsed.appSpecs)) {
      return emptyAppForgeData()
    }

    const runtimeByAppId = isRecord(parsed.runtimeByAppId)
      ? Object.fromEntries(
          Object.entries(parsed.runtimeByAppId).map(([appId, runtime]) => [
            appId,
            normalizeRuntimeState(runtime),
          ]),
        )
      : {}

    return {
      appSpecs: parsed.appSpecs.filter(isAppSpec),
      runtimeByAppId,
    }
  } catch {
    return emptyAppForgeData()
  }
}

export const saveAppForgeData = (data: AppForgeData) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Keep the app usable if storage is unavailable or full.
  }
}

export const resetAppForgeData = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Keep reset non-fatal in restricted browser contexts.
  }
}
