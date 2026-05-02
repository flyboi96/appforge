import { useRef, useState, type ChangeEvent } from 'react'
import { parseAppForgeDataJson } from '../storage/appForgeStore'
import type { AppForgeData } from '../types/appSpec'

interface SettingsScreenProps {
  appCount: number
  onResetData: () => void
  onExportData: () => void
  onImportData: (data: AppForgeData) => void
}

export function SettingsScreen({
  appCount,
  onResetData,
  onExportData,
  onImportData,
}: SettingsScreenProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importMessage, setImportMessage] = useState('')

  const confirmReset = () => {
    if (
      window.confirm(
        'Reset all local AppForge data? This deletes generated app specs and runtime data.',
      )
    ) {
      onResetData()
    }
  }

  const openImportPicker = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setImportMessage('')

    if (!file) {
      return
    }

    const importedData = parseAppForgeDataJson(await file.text())

    if (!importedData) {
      setImportMessage('Import failed. Choose a valid AppForge JSON export.')
      return
    }

    if (
      appCount > 0 &&
      !window.confirm(
        'Importing this file will overwrite your current AppForge library and runtime data. Continue?',
      )
    ) {
      setImportMessage('Import canceled.')
      return
    }

    onImportData(importedData)
    setImportMessage(
      `Imported ${importedData.appSpecs.length} saved app${
        importedData.appSpecs.length === 1 ? '' : 's'
      }.`,
    )
  }

  return (
    <section className="screen-stack">
      <div className="screen-heading">
        <p className="eyebrow">Settings</p>
        <h2>Local AI-style MVP</h2>
      </div>

      <section className="panel settings-list">
        <div>
          <span>Generator</span>
          <strong>Mock local</strong>
        </div>
        <div>
          <span>Saved apps</span>
          <strong>{appCount}</strong>
        </div>
        <div>
          <span>Storage</span>
          <strong>localStorage</strong>
        </div>
        <div>
          <span>Backend</span>
          <strong>None</strong>
        </div>
      </section>

      <section className="panel library-tools">
        <div>
          <h3>Library backup</h3>
          <p>Export or import saved app specs and runtime data as JSON.</p>
        </div>
        <div className="button-row wrap">
          <button
            type="button"
            className="secondary-button"
            onClick={onExportData}
          >
            Export Library
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={openImportPicker}
          >
            Import Library
          </button>
        </div>
        <input
          ref={importInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
        />
        {importMessage ? <p className="status-text">{importMessage}</p> : null}
      </section>

      <section className="panel danger-zone">
        <div>
          <h3>Reset local data</h3>
          <p>Clears generated specs, form values, lists, and saved entries.</p>
        </div>
        <button type="button" className="danger-button" onClick={confirmReset}>
          Reset local data
        </button>
      </section>
    </section>
  )
}
