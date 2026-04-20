'use strict'

const functions = require('firebase-functions')
const admin     = require('firebase-admin')
const crypto    = require('crypto')

admin.initializeApp()

const CF_API_VERSION = '2023-08-01'
const CF_BASE        = 'https://api.cashfree.com'

const YT_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Cache-Control':   'no-cache',
}

// Temple definitions — mirrors LivePuja.jsx
const TEMPLES = [
  { id: 1, channelHandle: 'MahakalLiveDarshanOfficial' },
  { id: 2, channelHandle: 'SomnathTempleOfficialChannel' },
  { id: 3, channelHandle: 'ShreeKashiVishwanathMandir' },
  { id: 4, channelHandle: 'shirdisaidhaam' },
  { id: 5, channelHandle: 'mayurbhakti' },
  { id: 6, channelHandle: 'vadatal' },
  { id: 7, livebhagwanChannel: 'livebhagwan',              keyword: 'dwarkadhish' },
  { id: 8, livebhagwanChannel: 'livebhagwan',              keyword: 'sarangpur'   },
  { id: 9, livebhagwanChannel: 'ShriMohankhedaTirthTrust', keyword: null          },
]

// ── YouTube helpers ───────────────────────────────────────────────────────────

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

async function fetchLiveIdForChannel(channelHandle) {
  try {
    const resp = await fetch(`https://www.youtube.com/@${channelHandle}/live`, { headers: YT_HEADERS })
    if (!resp.ok) return null
    return extractVideoId(await resp.text())
  } catch { return null }
}

// ── autoUpdateStreamIds — runs every 30 min ───────────────────────────────────
// Fetches latest live video IDs from each temple's YouTube channel and
// publishes updated values to Firebase Remote Config automatically.
// Requires Blaze plan (free tier covers ~2M invocations/month — cost is $0).
exports.autoUpdateStreamIds = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    const updates = {}

    // ── Official temple channels (fetch /live page)
    const officialTemples = TEMPLES.filter(t => t.channelHandle)
    await Promise.all(officialTemples.map(async t => {
      const id = await fetchLiveIdForChannel(t.channelHandle)
      if (id) {
        updates[`temple_${t.id}_live_id`] = id
        console.log(`Temple ${t.id} (${t.channelHandle}): ${id}`)
      }
    }))

    // ── livebhagwan channel (Dwarkadish + Sarangpur together — one fetch)
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

    // ── Mohankheda (daily new video — grab latest from streams page)
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
      console.log('No updates found — Remote Config unchanged')
      return null
    }

    // ── Write to Remote Config
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
        console.log(`RC update: ${key}  ${current} → ${newValue}`)
        changed = true
      }
    }

    if (changed) {
      await rc.publishTemplate(template)
      console.log('Remote Config published ✓')
    } else {
      console.log('All IDs already current — no publish needed')
    }

    return null
  })

// ─────────────────────────────────────────────────────────────────────────────
// Payment functions (credentials stay on server, never in the app)
// Set with: firebase functions:config:set cashfree.app_id="..." cashfree.secret="..." cashfree.webhook_secret="..."
// ─────────────────────────────────────────────────────────────────────────────

function cfHeaders() {
  const cfg = functions.config().cashfree || {}
  return {
    'Content-Type':    'application/json',
    'x-client-id':     cfg.app_id || '',
    'x-client-secret': cfg.secret || '',
    'x-api-version':   CF_API_VERSION,
  }
}

exports.createDonationOrder = functions.https.onCall(async (data) => {
  const { amount, templeId, templeName } = data
  if (!amount || amount < 1) throw new functions.https.HttpsError('invalid-argument', 'Invalid amount')

  const orderId = `bhaktdwaar${templeId}t${Date.now()}`
  const res     = await fetch(`${CF_BASE}/pg/orders`, {
    method:  'POST',
    headers: cfHeaders(),
    body:    JSON.stringify({
      order_id: orderId, order_amount: amount, order_currency: 'INR',
      customer_details: {
        customer_id: 'bhakt001', customer_name: 'Devotee',
        customer_email: 'devotee@bhaktdwaar.app', customer_phone: '0000000000',
      },
      order_meta:  { return_url: `https://bhakti.vaomi.org/?order_id=${orderId}` },
      order_note:  `Donation to ${templeName}`,
    }),
  })
  const body = await res.json()
  if (!body.payment_session_id) throw new functions.https.HttpsError('internal', body.message || 'Order creation failed')

  await admin.firestore().collection('donations').doc(orderId).set({
    orderId, amount, templeId, templeName,
    status: 'PENDING', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { orderId, checkoutUrl: `${CF_BASE}/checkout/?pt=${encodeURIComponent(body.payment_session_id)}` }
})

exports.verifyDonation = functions.https.onCall(async (data) => {
  const { orderId } = data
  if (!orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing orderId')

  const res   = await fetch(`${CF_BASE}/pg/orders/${orderId}`, { headers: cfHeaders() })
  const order = await res.json()
  const paid  = order.order_status === 'PAID'

  await admin.firestore().collection('donations').doc(orderId).update({
    status: paid ? 'SUCCESS' : (order.order_status || 'UNKNOWN'),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {})

  return { paid, status: order.order_status, amount: order.order_amount }
})

exports.cashfreeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const sig     = req.headers['x-webhook-signature']
  const ts      = req.headers['x-webhook-timestamp']
  const wSecret = (functions.config().cashfree || {}).webhook_secret

  if (sig && ts && wSecret) {
    const expected = crypto.createHmac('sha256', wSecret)
      .update(ts + JSON.stringify(req.body)).digest('base64')
    if (sig !== expected) return res.status(400).json({ error: 'Invalid signature' })
  }

  const orderId       = req.body.data?.order?.order_id
  const paymentStatus = req.body.data?.payment?.payment_status

  if (orderId && paymentStatus) {
    await admin.firestore().collection('donations').doc(orderId).update({
      status: paymentStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {})
  }

  return res.json({ received: true })
})
