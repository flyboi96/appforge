interface SettingsScreenProps {
  appCount: number
  onResetData: () => void
}

export function SettingsScreen({ appCount, onResetData }: SettingsScreenProps) {
  const confirmReset = () => {
    if (
      window.confirm(
        'Reset all local AppForge data? This deletes generated app specs and runtime data.',
      )
    ) {
      onResetData()
    }
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
