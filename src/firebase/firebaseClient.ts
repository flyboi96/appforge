import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from 'firebase/functions'

let firebaseApp: FirebaseApp | null = null
let firebaseFunctions: Functions | null = null
let emulatorConnected = false

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredConfigValues = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
]

export const isFirebaseConfigured = () =>
  requiredConfigValues.every(
    (value) => typeof value === 'string' && value.trim() !== '',
  )

export const isAiGenerationEnabled = () =>
  import.meta.env.VITE_ENABLE_AI_GENERATION === 'true'

export const getAppForgeFunctions = () => {
  if (!isFirebaseConfigured()) {
    return null
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig)
  }

  if (!firebaseFunctions) {
    firebaseFunctions = getFunctions(
      firebaseApp,
      import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1',
    )
  }

  if (
    import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' &&
    !emulatorConnected
  ) {
    connectFunctionsEmulator(firebaseFunctions, '127.0.0.1', 5001)
    emulatorConnected = true
  }

  return firebaseFunctions
}
