import { initializeApp, getApps } from 'firebase/app'
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config'
import { getFunctions } from 'firebase/functions'

// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS (one-time):
//   1. Go to console.firebase.google.com
//   2. Create project (or select existing)
//   3. Project settings → Your apps → Add app → Web (</>)
//   4. Copy the firebaseConfig object below and replace the REPLACE_ values
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAPIPnevrGWUaR6L5sB0clpXhaHEDow4SU",
  authDomain:        "bhakt-dwaar-89532.firebaseapp.com",
  projectId:         "bhakt-dwaar-89532",
  storageBucket:     "bhakt-dwaar-89532.firebasestorage.app",
  messagingSenderId: "740320645946",
  appId:             "1:740320645946:web:419eb964a99f9b60d9b603",
  measurementId:     "G-VV95W5PVE2",
}

const CONFIGURED = !firebaseConfig.apiKey.startsWith('REPLACE_')

const app = CONFIGURED
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null

// ── Firebase Functions (callable) ─────────────────────────────────────────────
export const firebaseFunctions = app ? getFunctions(app) : null

// ── Remote Config ─────────────────────────────────────────────────────────────
const rc = app ? getRemoteConfig(app) : null

if (rc) {
  // Cache for 1 hour — balance freshness vs. quota
  rc.settings.minimumFetchIntervalMillis = 60 * 60 * 1000

  // Default values = current hardcoded IDs.
  // App works fully even before Remote Config is set up in Firebase console.
  rc.defaultConfig = {
    temple_1_live_id:     'GY3pRyiNyuA',  // Mahakaleshwar
    temple_1_fallback_id: 'm7SfQQ9WmWI',
    temple_2_live_id:     'wPN7-MrOv94',  // Somnath
    temple_2_fallback_id: 'w2jPGtNrSqM',
    temple_3_live_id:     'jBT0LjGTO1A',  // Kashi Vishwanath
    temple_3_fallback_id: 'rIGKMkOnJQE',
    temple_4_live_id:     'xXdcwtGQ_zI',  // Shirdi Sai Baba
    temple_4_fallback_id: 'DUcpv8NkoVE',
    temple_5_live_id:     'UtrboFo6U6g',  // Siddhivinayak
    temple_5_fallback_id: 'ikWN4bh38y8',
    temple_6_live_id:     'e3gINhd28OY',  // Vadatal
    temple_6_fallback_id: 'lQukA3vYgTI',
    temple_7_live_id:     'gzv857BTcJM',  // Dwarkadish
    temple_7_fallback_id: 'GBjAKVFxK9U',
    temple_8_live_id:     'MmcXgQHi8WU',  // Sarangpur Hanumanji
    temple_8_fallback_id: '_y6UcdV0a1E',
    temple_9_live_id:     't7gV9k0LJKo',  // Mohankheda Tirth
    temple_9_fallback_id: '49dxAA_rY8Q',
  }
}

/**
 * Fetch Remote Config and return a map of temple id → { liveId, fallbackId }.
 * Falls back silently to defaultConfig if network is unavailable.
 */
export async function fetchTempleIds() {
  if (!rc) return {}
  try {
    await fetchAndActivate(rc)
  } catch {
    // Network unavailable — defaultConfig is already active, continue
  }
  const ids = {}
  for (let i = 1; i <= 9; i++) {
    const liveId     = getValue(rc, `temple_${i}_live_id`).asString()
    const fallbackId = getValue(rc, `temple_${i}_fallback_id`).asString()
    if (liveId) ids[i] = { liveId, fallbackId }
  }
  return ids
}
