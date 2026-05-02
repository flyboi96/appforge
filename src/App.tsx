import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { BottomNav, type PrimaryScreen } from './components/BottomNav'
import { AppDetailScreen } from './screens/AppDetailScreen'
import { CreateScreen } from './screens/CreateScreen'
import { GeneratedReviewScreen } from './screens/GeneratedReviewScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import {
  emptyAppForgeData,
  emptyRuntimeState,
  loadAppForgeData,
  resetAppForgeData,
  saveAppForgeData,
} from './storage/appForgeStore'
import type {
  AppForgeData,
  AppRuntimeState,
  AppSpec,
  GeneratedAppDraft,
  RuntimeValue,
  StoredRecord,
  StoredValue,
} from './types/appSpec'
import './App.css'

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const refreshAppTimestamp = (appSpec: AppSpec): AppSpec => ({
  ...appSpec,
  updatedAt: new Date().toISOString(),
})

const exportFileName = () => {
  const date = new Date().toISOString().slice(0, 10)
  return `appforge-library-${date}.json`
}

function App() {
  const [data, setData] = useState<AppForgeData>(() => loadAppForgeData())
  const [activeScreen, setActiveScreen] = useState<PrimaryScreen>('create')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [draft, setDraft] = useState<GeneratedAppDraft | null>(null)

  const selectedApp = selectedAppId
    ? data.appSpecs.find((appSpec) => appSpec.id === selectedAppId)
    : undefined

  const updateData = (updater: (currentData: AppForgeData) => AppForgeData) => {
    setData((currentData) => {
      const nextData = updater(currentData)
      saveAppForgeData(nextData)
      return nextData
    })
  }

  const navigate = (screen: PrimaryScreen) => {
    setActiveScreen(screen)
    setSelectedAppId(null)
    setDraft(null)
  }

  const saveDraftToLibrary = () => {
    if (!draft) {
      return
    }

    const appSpec = draft.appSpec
    updateData((currentData) => ({
      appSpecs: [appSpec, ...currentData.appSpecs],
      runtimeByAppId: {
        ...currentData.runtimeByAppId,
        [appSpec.id]: emptyRuntimeState(),
      },
    }))
    setDraft(null)
    setActiveScreen('library')
    setSelectedAppId(appSpec.id)
  }

  const deleteApp = (appId: string) => {
    updateData((currentData) => {
      const nextRuntimeByAppId = { ...currentData.runtimeByAppId }
      delete nextRuntimeByAppId[appId]

      return {
        appSpecs: currentData.appSpecs.filter((appSpec) => appSpec.id !== appId),
        runtimeByAppId: nextRuntimeByAppId,
      }
    })

    if (selectedAppId === appId) {
      setSelectedAppId(null)
    }
  }

  const duplicateApp = (appId: string) => {
    const appSpec = data.appSpecs.find((candidate) => candidate.id === appId)

    if (!appSpec) {
      return
    }

    const now = new Date().toISOString()
    const duplicatedApp: AppSpec = {
      ...structuredClone(appSpec),
      id: createId(),
      name: `${appSpec.name} Copy`,
      createdAt: now,
      updatedAt: now,
    }

    updateData((currentData) => ({
      appSpecs: [duplicatedApp, ...currentData.appSpecs],
      runtimeByAppId: {
        ...currentData.runtimeByAppId,
        [duplicatedApp.id]: emptyRuntimeState(),
      },
    }))
  }

  const resetLocalData = () => {
    resetAppForgeData()
    setData(emptyAppForgeData())
    setSelectedAppId(null)
    setDraft(null)
    setActiveScreen('create')
  }

  const exportLibrary = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = exportFileName()
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const importLibrary = (importedData: AppForgeData) => {
    updateData(() => importedData)
    setSelectedAppId(null)
    setDraft(null)
    setActiveScreen('library')
  }

  const updateSelectedRuntime = (
    updater: (runtime: AppRuntimeState) => AppRuntimeState,
  ) => {
    if (!selectedAppId) {
      return
    }

    updateData((currentData) => {
      const currentRuntime =
        currentData.runtimeByAppId[selectedAppId] ?? emptyRuntimeState()

      return {
        appSpecs: currentData.appSpecs.map((appSpec) =>
          appSpec.id === selectedAppId ? refreshAppTimestamp(appSpec) : appSpec,
        ),
        runtimeByAppId: {
          ...currentData.runtimeByAppId,
          [selectedAppId]: updater(currentRuntime),
        },
      }
    })
  }

  const updateBlockValue = (blockId: string, value: RuntimeValue) => {
    updateSelectedRuntime((runtime) => ({
      ...runtime,
      valuesByBlockId: {
        ...runtime.valuesByBlockId,
        [blockId]: value,
      },
    }))
  }

  const clearBlockValues = (blockIds: string[]) => {
    updateSelectedRuntime((runtime) => {
      const nextValues = { ...runtime.valuesByBlockId }
      blockIds.forEach((blockId) => {
        delete nextValues[blockId]
      })

      return {
        ...runtime,
        valuesByBlockId: nextValues,
      }
    })
  }

  const addRecord = (storeId: string, values: Record<string, StoredValue>) => {
    updateSelectedRuntime((runtime) => {
      const currentRecords = runtime.dataByStoreId[storeId] ?? []
      const nextRecord: StoredRecord = {
        id: createId(),
        createdAt: new Date().toISOString(),
        values,
      }

      return {
        ...runtime,
        dataByStoreId: {
          ...runtime.dataByStoreId,
          [storeId]: [nextRecord, ...currentRecords],
        },
      }
    })
  }

  const deleteRecord = (storeId: string, recordId: string) => {
    updateSelectedRuntime((runtime) => ({
      ...runtime,
      dataByStoreId: {
        ...runtime.dataByStoreId,
        [storeId]: (runtime.dataByStoreId[storeId] ?? []).filter(
          (record) => record.id !== recordId,
        ),
      },
    }))
  }

  const renderScreen = () => {
    if (selectedApp) {
      return (
        <AppDetailScreen
          appSpec={selectedApp}
          runtime={data.runtimeByAppId[selectedApp.id] ?? emptyRuntimeState()}
          onBack={() => setSelectedAppId(null)}
          onValueChange={updateBlockValue}
          onClearValues={clearBlockValues}
          onRecordAdd={addRecord}
          onRecordDelete={deleteRecord}
        />
      )
    }

    if (draft) {
      return (
        <GeneratedReviewScreen
          draft={draft}
          onBack={() => setDraft(null)}
          onSave={saveDraftToLibrary}
        />
      )
    }

    if (activeScreen === 'library') {
      return (
        <LibraryScreen
          appSpecs={data.appSpecs}
          onOpen={setSelectedAppId}
          onDuplicate={duplicateApp}
          onDelete={deleteApp}
          onCreateNew={() => navigate('create')}
        />
      )
    }

    if (activeScreen === 'settings') {
      return (
        <SettingsScreen
          appCount={data.appSpecs.length}
          onResetData={resetLocalData}
          onExportData={exportLibrary}
          onImportData={importLibrary}
        />
      )
    }

    return <CreateScreen onDraftGenerated={setDraft} />
  }

  return (
    <div className="app-shell">
      <AppHeader appCount={data.appSpecs.length} />
      <main className="app-main">{renderScreen()}</main>
      <BottomNav activeScreen={activeScreen} onNavigate={navigate} />
    </div>
  )
}

export default App
