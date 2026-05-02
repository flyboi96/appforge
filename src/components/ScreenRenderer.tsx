import { useState } from 'react'
import { BlockRenderer } from './BlockRenderer'
import type {
  AppRuntimeState,
  AppSpec,
  RuntimeValue,
  StoredValue,
} from '../types/appSpec'

interface ScreenRendererProps {
  appSpec: AppSpec
  runtime: AppRuntimeState
  onValueChange: (blockId: string, value: RuntimeValue) => void
  onClearValues: (blockIds: string[]) => void
  onRecordAdd: (storeId: string, values: Record<string, StoredValue>) => void
  onRecordDelete: (storeId: string, recordId: string) => void
}

export function ScreenRenderer({
  appSpec,
  runtime,
  onValueChange,
  onClearValues,
  onRecordAdd,
  onRecordDelete,
}: ScreenRendererProps) {
  const [activeScreenId, setActiveScreenId] = useState(appSpec.screens[0]?.id ?? '')
  const activeScreen =
    appSpec.screens.find((screen) => screen.id === activeScreenId) ??
    appSpec.screens[0]
  const allBlocks = appSpec.screens.flatMap((screen) => screen.blocks)

  if (!activeScreen) {
    return (
      <section className="unsupported-block">
        <strong>No screens</strong>
        <span>This generated app does not contain any screens.</span>
      </section>
    )
  }

  return (
    <section className="screen-renderer">
      {appSpec.screens.length > 1 ? (
        <div className="screen-tabs" role="tablist" aria-label="Generated app screens">
          {appSpec.screens.map((screen) => (
            <button
              key={screen.id}
              type="button"
              className={
                screen.id === activeScreen.id ? 'screen-tab active' : 'screen-tab'
              }
              onClick={() => setActiveScreenId(screen.id)}
            >
              {screen.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="screen-heading compact">
        <p className="eyebrow">Screen</p>
        <h2>{activeScreen.title}</h2>
        {activeScreen.description ? <p>{activeScreen.description}</p> : null}
      </div>

      <div className="block-list">
        {activeScreen.blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            blocks={allBlocks}
            runtime={runtime}
            onValueChange={onValueChange}
            onClearValues={onClearValues}
            onRecordAdd={onRecordAdd}
            onRecordDelete={onRecordDelete}
          />
        ))}
      </div>
    </section>
  )
}
