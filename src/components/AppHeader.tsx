interface AppHeaderProps {
  appCount: number
}

export function AppHeader({ appCount }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Local mini-app studio</p>
        <h1>AppForge</h1>
      </div>
      <div className="header-count" aria-label={`${appCount} saved mini-apps`}>
        {appCount}
      </div>
    </header>
  )
}
