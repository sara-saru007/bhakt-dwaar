'use strict'

const admin = require('firebase-admin')

const YT_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Cache-Control':   'no-cache',
}

const TEMPLES = [
  { id: 1, channelHandle: 'MahakalLiveDarshanOfficial' },
  { id: 2, channelHandle: 'SomnathTempleOfficialChannel' },
  { id: 3, channelHandle: 'ShreeKashiVishwanathMandir' },
  { id: 4, channelHandle: 'shirdisaidhaam' },
  { id: 5, channelHandle: 'mayurbhakti' },
  { id: 6, channelHandle: 'vadatal' },
  { id: 7, livebhagwanChannel: 'livebhagwan', keyword: 'dwarkadhish' },
  { id: 8, livebhagwanChannel: 'livebhagwan', keyword: 'sarangpur'   },
  { id: 9, livebhagwanChannel: 'ShriMohankhedaTirthTrust', keyword: null },
]

function extractVideoId(html) {
  const c = html.match(/<link rel="canonical" href="[^"]*\/watch\?v=([a-zA-Z0-9_-]{11})"/)
  if (c) return c[1]
  const o = html.match(/property="og:url" content="[^"]*\/watch\?v=([a-zA-Z0-9_-]{11})"/)
  if (o) return o[1]
  const v = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
  if (v) return v[1]
  return null
}

function findIdNearKeyword(html, keyword) {
  const idx = html.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return null
  const seg     = html.substring(Math.max(0, idx - 3000), idx)
  const matches = [...seg.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)]
  return matches.length ? matches[matches.length - 1][1] : null
}

async function fetchLiveIdForChannel(handle) {
  try {
    const resp = await fetch(`https://www.youtube.com/@${handle}/live`, { headers: YT_HEADERS })
    if (!resp.ok) return null
    return extractVideoId(await resp.text())
  } catch { return null }
}

async function main() {
  // Init Firebase Admin from service account JSON in env var
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

  const updates = {}

  // Official temple channels
  const official = TEMPLES.filter(t => t.channelHandle)
  await Promise.all(official.map(async t => {
    const id = await fetchLiveIdForChannel(t.channelHandle)
    if (id) {
      updates[`temple_${t.id}_live_id`] = id
      console.log(`Temple ${t.id} (${t.channelHandle}): ${id}`)
    } else {
      console.log(`Temple ${t.id} (${t.channelHandle}): no live found`)
    }
  }))

  // livebhagwan channel (Dwarkadish + Sarangpur)
  try {
    const resp = await fetch('https://www.youtube.com/@livebhagwan/streams', { headers: YT_HEADERS })
    if (resp.ok) {
      const html = await resp.text()
      TEMPLES.filter(t => t.livebhagwanChannel === 'livebhagwan').forEach(t => {
        const id = findIdNearKeyword(html, t.keyword)
        if (id) {
          updates[`temple_${t.id}_live_id`] = id
          console.log(`Temple ${t.id} (livebhagwan/${t.keyword}): ${id}`)
        }
      })
    }
  } catch (e) { console.warn('livebhagwan fetch failed:', e.message) }

  // Mohankheda
  try {
    const resp = await fetch('https://www.youtube.com/@ShriMohankhedaTirthTrust/streams', { headers: YT_HEADERS })
    if (resp.ok) {
      const html = await resp.text()
      const m    = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (m) {
        updates['temple_9_live_id'] = m[1]
        console.log(`Temple 9 (Mohankheda): ${m[1]}`)
      }
    }
  } catch (e) { console.warn('Mohankheda fetch failed:', e.message) }

  if (!Object.keys(updates).length) {
    console.log('No live IDs found — Remote Config unchanged')
    return
  }

  const rc       = admin.remoteConfig()
  const template = await rc.getTemplate()

  let changed = false
  for (const [key, newValue] of Object.entries(updates)) {
    const current = template.parameters[key]?.defaultValue?.value
    if (current !== newValue) {
      if (!template.parameters[key]) {
        template.parameters[key] = { defaultValue: { value: newValue } }
      } else {
        template.parameters[key].defaultValue.value = newValue
      }
      console.log(`RC: ${key}  ${current} → ${newValue}`)
      changed = true
    }
  }

  if (changed) {
    await rc.publishTemplate(template)
    console.log('Remote Config published ✓')
  } else {
    console.log('All IDs already current — no publish needed')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
