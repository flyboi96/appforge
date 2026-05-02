export type PrimaryScreen = 'create' | 'library' | 'settings'

interface BottomNavProps {
  activeScreen: PrimaryScreen
  onNavigate: (screen: PrimaryScreen) => void
}

const navItems: Array<{
  id: PrimaryScreen
  label: string
  icon: string
}> = [
  { id: 'create', label: 'Create', icon: '+' },
  { id: 'library', label: 'Library', icon: '▦' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={activeScreen === item.id ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
