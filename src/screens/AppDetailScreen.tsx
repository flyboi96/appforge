import { ScreenRenderer } from '../components/ScreenRenderer'
import type {
  AppRuntimeState,
  AppSpec,
  RuntimeValue,
  StoredValue,
} from '../types/appSpec'

interface AppDetailScreenProps {
  appSpec: AppSpec
  runtime: AppRuntimeState
  onBack: () => void
  onValueChange: (blockId: string, value: RuntimeValue) => void
  onClearValues: (blockIds: string[]) => void
  onRecordAdd: (storeId: string, values: Record<string, StoredValue>) => void
  onRecordDelete: (storeId: string, recordId: string) => void
}

export function AppDetailScreen({
  appSpec,
  runtime,
  onBack,
  onValueChange,
  onClearValues,
  onRecordAdd,
  onRecordDelete,
}: AppDetailScreenProps) {
  return (
    <section className="screen-stack">
      <button type="button" className="back-button" onClick={onBack}>
        Back to Library
      </button>

      <header className="detail-header">
        <span className="detail-icon" aria-hidden="true">
          {appSpec.icon}
        </span>
        <div>
          <p className="eyebrow">{appSpec.category}</p>
          <h2>{appSpec.name}</h2>
          <p>{appSpec.description}</p>
        </div>
      </header>

      <ScreenRenderer
        appSpec={appSpec}
        runtime={runtime}
        onValueChange={onValueChange}
        onClearValues={onClearValues}
        onRecordAdd={onRecordAdd}
        onRecordDelete={onRecordDelete}
      />
    </section>
  )
}
