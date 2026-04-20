import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { fetchTempleIds } from '../firebase'

// ── Static temple list (also exported for TempleStream URL fallback)
export const TEMPLES = [
  {
    id: 1,
    nameHindi: 'श्री महाकालेश्वर मंदिर',
    locationHindi: 'उज्जैन, मध्य प्रदेश',
    deityHindi: 'भगवान शिव',
    channelHandle: 'MahakalLiveDarshanOfficial',
    liveVideoId: 'GY3pRyiNyuA',
    fallbackVideoId: 'm7SfQQ9WmWI',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    image: 'https://visitujjain.com/wp-content/uploads/2024/12/Mahakaleshwar.jpg',
    emoji: '🔱',
    gradFrom: '#0a0028', gradTo: '#1a004a',
    accent: '#7c3aed',
    viewers: 34521,
  },
  {
    id: 2,
    nameHindi: 'श्री सोमनाथ मंदिर',
    locationHindi: 'सोमनाथ, गुजरात',
    deityHindi: 'भगवान शिव',
    channelHandle: 'SomnathTempleOfficialChannel',
    liveVideoId: 'wPN7-MrOv94',
    fallbackVideoId: 'w2jPGtNrSqM',
    fallbackStartAt: 3000,
    checkDarkScreen: false,
    image: 'https://magikindia.com/wp-content/uploads/2015/12/somnath-jyotir-lingam.jpg',
    emoji: '🔱',
    gradFrom: '#001830', gradTo: '#002e55',
    accent: '#0ea5e9',
    viewers: 28932,
  },
  {
    id: 3,
    nameHindi: 'श्री काशी विश्वनाथ',
    locationHindi: 'वाराणसी, उत्तर प्रदेश',
    deityHindi: 'भगवान शिव',
    channelHandle: 'ShreeKashiVishwanathMandir',
    liveVideoId: 'jBT0LjGTO1A',
    fallbackVideoId: 'rIGKMkOnJQE',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    image: 'https://cdn.shopify.com/s/files/1/0825/8404/3804/files/History_Origin_of_Kashi_Vishwanath.jpg?v=1770198665',
    emoji: '🕉️',
    gradFrom: '#2d0a00', gradTo: '#4a1200',
    accent: '#f97316',
    viewers: 41205,
  },
  {
    id: 4,
    nameHindi: 'साईं बाबा मंदिर शिरडी',
    locationHindi: 'शिरडी, महाराष्ट्र',
    deityHindi: 'साईं बाबा',
    channelHandle: 'shirdisaidhaam',
    liveVideoId: 'xXdcwtGQ_zI',
    fallbackVideoId: 'DUcpv8NkoVE',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2t1F7xrnmojG-QuJ2U1pajbuHk7IUxQxaPw&s',
    emoji: '✨',
    gradFrom: '#1a1000', gradTo: '#2d1e00',
    accent: '#eab308',
    viewers: 22104,
  },
  {
    id: 5,
    nameHindi: 'श्री सिद्धिविनायक मंदिर',
    locationHindi: 'मुंबई, महाराष्ट्र',
    deityHindi: 'भगवान गणेश',
    channelHandle: 'mayurbhakti',
    liveVideoId: 'UtrboFo6U6g',
    fallbackVideoId: 'ikWN4bh38y8',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    image: 'https://godsphoto.com/_next/image?url=https%3A%2F%2Fd1izoyu1tdmpr.cloudfront.net%2Fgods%2Flord-ganesha-photos.jpg&w=1200&q=75',
    emoji: '🐘',
    gradFrom: '#1a0800', gradTo: '#2e1400',
    accent: '#ff8c00',
    viewers: 19876,
  },
  {
    id: 6,
    nameHindi: 'वडताल स्वामीनारायण मंदिर',
    locationHindi: 'वडताल, गुजरात',
    deityHindi: 'भगवान स्वामीनारायण',
    channelHandle: 'vadatal',
    liveVideoId: 'e3gINhd28OY',
    fallbackVideoId: 'lQukA3vYgTI',
    fallbackStartAt: 0,
    checkDarkScreen: true,
    image: 'https://i.pinimg.com/736x/f2/14/02/f21402529251e9f52c5dadac6568345b.jpg',
    emoji: '🪷',
    gradFrom: '#150030', gradTo: '#2a0050',
    accent: '#c084fc',
    viewers: 15432,
  },
  // ── New temples sourced from livebhagwan.com ──
  {
    id: 7,
    nameHindi: 'श्री द्वारकाधीश मंदिर',
    locationHindi: 'द्वारका, गुजरात',
    deityHindi: 'भगवान श्री कृष्ण',
    channelHandle: null,
    liveVideoId: 'gzv857BTcJM',
    fallbackVideoId: 'GBjAKVFxK9U',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    // Polled from @livebhagwan YouTube channel every 30 min
    livebhagwanChannel: 'livebhagwan',
    livebhagwanKeyword: 'dwarkadhish',
    image: 'https://img.youtube.com/vi/gzv857BTcJM/maxresdefault.jpg',
    emoji: '🪷',
    gradFrom: '#001530', gradTo: '#003060',
    accent: '#38bdf8',
    viewers: 18650,
  },
  {
    id: 8,
    nameHindi: 'श्री सारंगपुर हनुमानजी',
    locationHindi: 'सारंगपुर, गुजरात',
    deityHindi: 'कष्टभंजन हनुमानजी',
    channelHandle: null,
    liveVideoId: 'MmcXgQHi8WU',
    fallbackVideoId: '_y6UcdV0a1E',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    livebhagwanChannel: 'livebhagwan',
    livebhagwanKeyword: 'sarangpur',
    image: 'https://img.youtube.com/vi/MmcXgQHi8WU/maxresdefault.jpg',
    emoji: '🚩',
    gradFrom: '#200010', gradTo: '#400020',
    accent: '#fb7185',
    viewers: 12350,
  },
  {
    id: 9,
    nameHindi: 'श्री मोहनखेड़ा तीर्थ',
    locationHindi: 'मोहनखेड़ा, मध्य प्रदेश',
    deityHindi: 'जैन तीर्थ',
    channelHandle: null,
    liveVideoId: 't7gV9k0LJKo',
    fallbackVideoId: '49dxAA_rY8Q',
    fallbackStartAt: 0,
    checkDarkScreen: false,
    // Polled from Shri Mohankheda Tirth Trust channel (daily new video)
    livebhagwanChannel: 'ShriMohankhedaTirthTrust',
    livebhagwanKeyword: 'mohankheda',
    image: 'https://img.youtube.com/vi/t7gV9k0LJKo/maxresdefault.jpg',
    emoji: '☮️',
    gradFrom: '#001a0f', gradTo: '#003020',
    accent: '#34d399',
    viewers: 8950,
  },
]

// ── Find the first video ID that appears before a keyword in YouTube page HTML
function findVideoIdForKeyword(html, keyword) {
  const idx = html.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return null
  const segment = html.substring(Math.max(0, idx - 3000), idx)
  const matches = [...segment.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)]
  if (matches.length === 0) return null
  return matches[matches.length - 1][1]  // last = closest to keyword
}

// ── Fetch updated live video IDs from livebhagwan's YouTube channel and Mohankheda's channel
async function pollLiveBhagwanUpdates(temples) {
  const isNative = window.Capacitor?.isNativePlatform?.() || false
  if (!isNative) return {}

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Referer': 'https://www.youtube.com/',
    'Cache-Control': 'no-cache',
  }

  const updates = {}

  try {
    // Poll @livebhagwan for Dwarkadish and Sarangpur
    const lbTemples = temples.filter(t => t.livebhagwanChannel === 'livebhagwan')
    if (lbTemples.length > 0) {
      const resp = await fetch('https://www.youtube.com/@livebhagwan/streams', { headers })
      if (resp.ok) {
        const html = await resp.text()
        for (const t of lbTemples) {
          const newId = findVideoIdForKeyword(html, t.livebhagwanKeyword)
          if (newId && newId !== t.liveVideoId) {
            updates[t.id] = newId
            console.log(`[livebhagwan poll] ${t.nameHindi}: ${t.liveVideoId} → ${newId}`)
          }
        }
      }
    }
  } catch (e) {
    console.warn('livebhagwan poll (@livebhagwan):', e)
  }

  try {
    // Poll @ShriMohankhedaTirthTrust for daily new video
    const mokhTemples = temples.filter(t => t.livebhagwanChannel === 'ShriMohankhedaTirthTrust')
    for (const t of mokhTemples) {
      const resp = await fetch('https://www.youtube.com/@ShriMohankhedaTirthTrust/streams', { headers })
      if (resp.ok) {
        const html = await resp.text()
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
        if (match && match[1] !== t.liveVideoId) {
          updates[t.id] = match[1]
          console.log(`[livebhagwan poll] ${t.nameHindi}: ${t.liveVideoId} → ${match[1]}`)
        }
      }
    }
  } catch (e) {
    console.warn('livebhagwan poll (@Mohankheda):', e)
  }

  return updates
}

function fmtViewers(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'क'
  return n.toString()
}

export default function LivePuja() {
  const navigate = useNavigate()
  // Dynamic temple state — updated by 30-min poll
  const [temples, setTemples] = useState(TEMPLES)
  const [viewers, setViewers] = useState(() => TEMPLES.map(t => t.viewers))
  const templesRef = useRef(temples)
  templesRef.current = temples

  // Animate viewer counts
  useEffect(() => {
    const iv = setInterval(() => {
      setViewers(prev => prev.map(v => Math.max(1000, v + Math.floor(Math.random() * 80) - 30)))
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  // ── Firebase Remote Config: fetch live/fallback IDs on launch
  // These override the hardcoded TEMPLES constants — update in Firebase console
  // in ~30 seconds without releasing a new app version.
  useEffect(() => {
    fetchTempleIds().then(ids => {
      if (!Object.keys(ids).length) return
      setTemples(prev => prev.map(t => {
        const rc = ids[t.id]
        if (!rc) return t
        return {
          ...t,
          ...(rc.liveId     ? { liveVideoId:     rc.liveId }     : {}),
          ...(rc.fallbackId ? { fallbackVideoId: rc.fallbackId } : {}),
        }
      }))
    }).catch(() => {})
  }, [])

  // ── Poll livebhagwan YouTube channels every 30 min for updated video IDs
  useEffect(() => {
    const poll = async () => {
      const updates = await pollLiveBhagwanUpdates(templesRef.current)
      if (Object.keys(updates).length > 0) {
        setTemples(prev => prev.map(t =>
          updates[t.id] ? { ...t, liveVideoId: updates[t.id] } : t
        ))
      }
    }
    poll()  // run immediately on mount
    const iv = setInterval(poll, 30 * 60 * 1000)  // then every 30 min
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0200', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        background: 'linear-gradient(180deg, rgba(255,100,0,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,140,0,0.12)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 30, filter: 'drop-shadow(0 0 8px #FF8C00)' }}>🕉️</span>
          <h1 style={{
            fontFamily: "'Noto Sans Devanagari', serif",
            fontSize: 30, fontWeight: 900,
            background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.2,
          }}>भक्त द्वार</h1>
          <span style={{ fontSize: 30, filter: 'drop-shadow(0 0 8px #FF8C00)' }}>🕉️</span>
        </div>
        <p style={{
          fontFamily: "'Noto Sans Devanagari', serif",
          fontSize: 17, color: 'rgba(255,215,0,0.75)', letterSpacing: 1,
        }}>लाइव मंदिर दर्शन</p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 10,
          background: 'rgba(255,40,40,0.15)', border: '1px solid rgba(255,80,80,0.35)',
          borderRadius: 20, padding: '5px 16px',
          fontSize: 14, color: '#FF6B6B', fontWeight: 700,
        }}>
          <span style={{
            width: 7, height: 7, background: '#FF2D2D', borderRadius: '50%',
            animation: 'blink 1.2s infinite',
            display: 'inline-block',
          }} />
          सभी मंदिर अभी लाइव हैं
        </div>
      </div>

      {/* Temple Cards Grid */}
      <div style={{ padding: '16px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {temples.map((temple, idx) => (
          <TempleCard
            key={temple.id}
            temple={temple}
            viewers={viewers[idx] ?? temple.viewers}
            onPress={() => navigate(`/temple-stream/${temple.id}`, { state: temple })}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', marginTop: 28,
        fontFamily: "'Noto Sans Devanagari', serif",
        fontSize: 15, color: 'rgba(255,215,0,0.4)',
      }}>
        🪔 ईश्वर आपका कल्याण करें 🪔
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  )
}

function TempleCard({ temple, viewers, onPress }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <button
      onClick={onPress}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        borderRadius: 18,
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${temple.gradFrom} 0%, ${temple.gradTo} 100%)`,
        border: `1px solid ${temple.accent}44`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.6)`,
        cursor: 'pointer',
        padding: 0,
        display: 'block',
      }}
    >
      {!imgErr ? (
        <img
          src={temple.image}
          alt={temple.deityHindi}
          onError={() => setImgErr(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 42%, ${temple.accent}28 0%, transparent 65%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 72,
        }}>{temple.emoji}</div>
      )}

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 38%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)',
      }} />

      {/* LIVE badge */}
      <div style={{
        position: 'absolute', top: 9, left: 9,
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(210,0,0,0.88)',
        borderRadius: 5, padding: '3px 7px',
      }}>
        <span style={{
          width: 6, height: 6, background: '#fff', borderRadius: '50%',
          animation: 'blink 1s infinite',
          display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 800, color: '#fff',
          letterSpacing: 0.8, fontFamily: "'Poppins', sans-serif",
        }}>LIVE</span>
      </div>

      {/* Play button */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(255,255,255,0.22)',
        border: '1.5px solid rgba(255,255,255,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#fff', marginLeft: 2 }}>▶</span>
      </div>

      {/* Temple name + info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 9px 10px' }}>
        <div style={{
          fontFamily: "'Noto Sans Devanagari', serif",
          fontSize: 15, fontWeight: 700, color: '#fff',
          lineHeight: 1.3, marginBottom: 2,
          textShadow: '0 1px 6px rgba(0,0,0,0.9)',
        }}>{temple.nameHindi}</div>
        <div style={{
          fontFamily: "'Noto Sans Devanagari', serif",
          fontSize: 12, color: `${temple.accent}ee`,
          marginBottom: 2, lineHeight: 1.2,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>{temple.deityHindi}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: "'Poppins', sans-serif" }}>
          👁 {fmtViewers(viewers)} दर्शनार्थी
        </div>
      </div>
    </button>
  )
}
