import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { TEMPLES } from './LivePuja'
import { firebaseFunctions } from '../firebase'
import { registerPlugin } from '@capacitor/core'

const ScreenAnalyzer = registerPlugin('ScreenAnalyzer')

const OPENAI_KEY = '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'
const CF_APP_ID = '11597423ac59b42ecef2255a3012479511'
const CF_SECRET = 'cfsk_ma_prod_482b427720070e4f4176069dbee628ea_4a90dc46'
const CF_BASE   = 'https://api.cashfree.com'
const HEADER_H = 60  // px — header height above video

// Firebase callable functions — credentials live on server, never in the app
const createDonationOrderFn = firebaseFunctions ? httpsCallable(firebaseFunctions, 'createDonationOrder') : null
const verifyDonationFn      = firebaseFunctions ? httpsCallable(firebaseFunctions, 'verifyDonation')      : null

// ── Fetch latest live video from YouTube channel /live page
async function fetchLatestLiveVideoId(channelHandle) {
  if (!channelHandle) return null
  try {
    const isNative = window.Capacitor?.isNativePlatform?.() || false
    if (!isNative) return null
    const url = `https://www.youtube.com/@${channelHandle}/live`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Referer': 'https://www.youtube.com/',
        'Cache-Control': 'no-cache',
      },
    })
    if (!response.ok) return null
    const html = await response.text()
    const canonical = html.match(/<link\s+rel="canonical"\s+href="[^"]*\/watch\?v=([a-zA-Z0-9_-]{11})"/)
    if (canonical) return canonical[1]
    const ogUrl = html.match(/property="og:url"[^>]+content="[^"]*\/watch\?v=([a-zA-Z0-9_-]{11})"/)
    if (ogUrl) return ogUrl[1]
    // Also check for videoId in page data
    const vidId = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    if (vidId) return vidId[1]
    return null
  } catch (e) {
    console.warn('fetchLatestLiveVideoId:', e)
    return null
  }
}

// ── Transcribe audio with OpenAI Whisper (Hindi)
async function transcribeWithWhisper(audioBlob) {
  try {
    const mimeType = (audioBlob.type || 'audio/webm').split(';')[0]
    // Whisper needs a filename with extension so it knows the format
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([audioBlob], `recording.${ext}`, { type: mimeType })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('language', 'hi')        // force Hindi
    formData.append('response_format', 'text')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: formData,
    })
    if (!res.ok) {
      console.warn('Whisper HTTP error:', res.status)
      return null
    }
    const text = await res.text()
    return text.trim() || null
  } catch (e) {
    console.warn('Whisper error:', e)
    return null
  }
}


const CHAT_MESSAGES = [
  '🙏 जय श्री राम!', '🔱 हर हर महादेव!', '🪷 राधे राधे!', '🌸 जय माता दी!',
  '✨ जय साईं राम!', '🐘 गणपति बाप्पा मोरया!', '🕉️ ॐ नमः शिवाय',
  '🙏 प्रभु आपकी जय हो!', '🔱 ॐ नमः शिवाय ॐ नमः शिवाय',
  '🌺 भगवान सबका भला करें', '🪔 आज का दर्शन बहुत शुभ है',
  '🙏 दिल्ली से प्रणाम 🙏', '🙏 मुंबई से जय श्री राम',
  '🙏 जयपुर से दर्शन कर रहे हैं', '🙏 बेंगलुरू से नमस्ते 🙏',
  '🙏 कोलकाता से जय माता दी', '🙏 अहमदाबाद से राम राम',
  '🌍 अमेरिका से दर्शन 🙏', '🌍 UK से जय श्री राम',
  '🌍 कनाडा से प्रणाम', '🌍 दुबई से जय श्री राम',
  '🔱 बम बम भोले!', '🔱 भोले बाबा की जय!',
  '🌺 आशीर्वाद मिला आज', '🙏 हमारे परिवार पर कृपा करें प्रभु',
  '🙏 घर में सुख शांति बनी रहे', '🕉️ सभी भक्तों की मनोकामना पूर्ण हो',
  '🌸 भगवान सबकी रक्षा करें', '✨ बहुत सुंदर दर्शन हो रहे हैं',
  '🌟 आज का दिन शुभ हो गया', '🪔 घर बैठे दर्शन हो रहे हैं, धन्यवाद',
  '🌺 इस दर्शन से मन को शांति मिली', '✨ भक्ति में ही मुक्ति है',
  '🔱 बम बम भोले! बम बम भोले!',
  '🙏 बहुत सालों से इस मंदिर में जाना चाहता था, आज दर्शन हो गए',
  '🪔 मन उदास था, यहाँ आकर शांति मिली',
  '✨ प्रभु का दर्शन और उनका नाम, यही जीवन की पूँजी है',
  '🙏 आप सबको जय श्री राम! सभी का मंगल हो',
  '🪷 राधे राधे राधे श्याम', '🕉️ ॐ ॐ ॐ शांति',
  '🔱 मेरे बेटे की परीक्षा में सफलता के लिए प्रार्थना',
  '🙏 नौकरी मिल गई! भगवान का शुक्रिया',
  '🌺 बेटी का विवाह तय हुआ, माँ का आशीर्वाद',
  '🌟 भारत माता की जय!', '🪔 जय हो! जय हो! जय हो!',
  '🙏 🙏🙏🙏', '✨ जय जय जय!', '🔱 💫🙏',
]

const FAKE_NAMES = [
  'राम शर्मा', 'प्रिया देवी', 'सुनीता अग्रवाल', 'मोहित वर्मा', 'कविता सिंह',
  'रमेश जी', 'अंजलि पटेल', 'दीपक कुमार', 'मीरा बाई', 'सुरेश नायर',
  'ललिता देवी', 'विक्रम राव', 'पूजा मेहता', 'अर्जुन दास', 'शांति माँ',
  'गोपाल जी', 'भारती देवी', 'विजय तिवारी', 'कृष्णा मूर्ति', 'संगीता जोशी',
]

const PRESET_MSGS = [
  '🙏 जय श्री राम', '🔱 हर हर महादेव', '🪷 राधे राधे',
  '🌸 जय माता दी', '✨ जय साईं राम', '🐘 गणपति बाप्पा',
]

const DONATE_AMOUNTS = [11, 21, 51, 101, 251, 501, 1001]

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }
function pick(arr) { return arr[rnd(0, arr.length - 1)] }

export default function TempleStream() {
  const navigate = useNavigate()
  const { state: routeTemple } = useLocation()
  const { templeId } = useParams()
  const temple = routeTemple || TEMPLES.find(t => t.id === Number(templeId)) || TEMPLES[0]

  const playerDivRef = useRef(null)
  const playerRef    = useRef(null)
  const cameraRef    = useRef(null)
  const streamRef    = useRef(null)
  const chatRef      = useRef(null)
  const wishMediaRef    = useRef(null)
  const wishTimerRef    = useRef(null)
  const wishAutoRef     = useRef(null)
  const camDragRef      = useRef(null)
  const recognitionRef  = useRef(null)
  const stallRef        = useRef({ lastTime: -1, stallCount: 0 })
  const visualCheckRef  = useRef(false)  // prevents overlapping visual stasis checks

  const isOnFallbackRef     = useRef(false)
  const isCheckingLiveRef   = useRef(false)
  const liveCheckTimeoutRef = useRef(null)

  const [chatMessages,  setChatMessages]  = useState([])
  const [chatInput,     setChatInput]     = useState('')
  const [viewers,       setViewers]       = useState(temple?.viewers || 20000)
  const [cameraError,   setCameraError]   = useState(false)
  const [donateOpen,          setDonateOpen]          = useState(false)
  const [donateLoading,       setDonateLoading]       = useState(false)
  const [donateSuccess,       setDonateSuccess]       = useState(null)   // string | null
  const [donateSuccessAmount, setDonateSuccessAmount] = useState(null)   // number | null — triggers full-screen UX
  const [muted,         setMuted]         = useState(false)
  const [isOnFallback,  setIsOnFallback]  = useState(false)
  const [bellAnimating, setBellAnimating] = useState(false)
  const [wishPhase,     setWishPhase]     = useState(null)  // null|'recording'|'blessing'
  const [wishSec,       setWishSec]       = useState(60)
  const [wishTranscript,setWishTranscript]= useState('')    // '' | 'loading' | actual text
  const [liveTranscript,setLiveTranscript]= useState('')    // live speech-to-text during recording

  // Camera starts below the video (header + video height)
  const [camPos, setCamPos] = useState(() => {
    const videoH = Math.round(window.innerWidth * 0.5625)
    return { x: window.innerWidth - 90, y: HEADER_H + videoH + 10 }
  })

  // ── Bell
  const ringBell = useCallback(() => {
    try { const a = new Audio('/bell.m4a'); a.currentTime = 0; a.play().catch(() => {}) } catch (_) {}
    setBellAnimating(true)
    setTimeout(() => setBellAnimating(false), 2200)
  }, [])

  // ── Stop wish → unmute → send to Whisper → show blessing with transcript
  const stopWish = useCallback(() => {
    clearInterval(wishTimerRef.current)
    clearTimeout(wishAutoRef.current)
    setLiveTranscript('')

    // Restore audio
    if (playerRef.current) {
      try { playerRef.current.unMute(); playerRef.current.setVolume(80) } catch {}
      setMuted(false)
    }

    if (wishMediaRef.current) {
      const { recorder, stream, chunks } = wishMediaRef.current

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setWishPhase('blessing')
        setWishTranscript('loading')   // show spinner while Whisper processes

        let text = ''
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          text = (await transcribeWithWhisper(blob)) || ''
        }
        setWishTranscript(text)
        wishMediaRef.current = null
        setTimeout(() => { setWishPhase(null); setWishTranscript('') }, 7000)
      }
      try { recorder.stop() } catch {}
    } else {
      setWishPhase('blessing')
      setWishTranscript('')
      setTimeout(() => { setWishPhase(null); setWishTranscript('') }, 5000)
    }
  }, [])

  // ── Start wish recording
  const startWish = useCallback(async () => {
    if (wishPhase) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) || ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      const chunks = []
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data) }
      wishMediaRef.current = { recorder, stream, chunks }
      recorder.start(500)
      // Mute player
      if (playerRef.current) { try { playerRef.current.mute() } catch {}; setMuted(true) }
      setWishPhase('recording')
      setWishSec(60)
      wishTimerRef.current = setInterval(() => {
        setWishSec(s => { if (s <= 1) { clearInterval(wishTimerRef.current); return 0 } return s - 1 })
      }, 1000)
      wishAutoRef.current = setTimeout(() => stopWish(), 60000)
    } catch (_) {
      setWishPhase('blessing')
      setWishTranscript('')
      setTimeout(() => setWishPhase(null), 5000)
    }
  }, [wishPhase, stopWish])

  // ── Switch to fallback
  const switchToFallback = useCallback(() => {
    if (isOnFallbackRef.current || !temple.fallbackVideoId) return
    isOnFallbackRef.current = true
    setIsOnFallback(true)
    if (playerRef.current) {
      playerRef.current.loadVideoById({ videoId: temple.fallbackVideoId, startSeconds: temple.fallbackStartAt || 0 })
    }
  }, [temple.fallbackVideoId, temple.fallbackStartAt])

  const switchToFallbackRef = useRef(switchToFallback)
  switchToFallbackRef.current = switchToFallback

  // ── YouTube player
  useEffect(() => {
    const ytId = `yt-player-${temple.id}-${Date.now()}`
    if (playerDivRef.current) playerDivRef.current.id = ytId
    isOnFallbackRef.current = false
    isCheckingLiveRef.current = false
    setIsOnFallback(false)

    const createPlayer = () => {
      if (!playerDivRef.current) return
      const p = new window.YT.Player(ytId, {
        height: '100%', width: '100%',
        videoId: temple.liveVideoId,
        playerVars: { autoplay: 1, playsinline: 1, mute: 0, rel: 0, controls: 0, modestbranding: 1, iv_load_policy: 3 },
        events: {
          onReady: (e) => { e.target.unMute(); e.target.setVolume(80); e.target.playVideo(); setMuted(false) },
          onError: () => {
            if (!isOnFallbackRef.current) {
              // Before going to fallback, try to pull the freshest live ID from the channel
              if (temple.channelHandle) {
                fetchLatestLiveVideoId(temple.channelHandle).then(freshId => {
                  if (freshId && playerRef.current && !isOnFallbackRef.current) {
                    isCheckingLiveRef.current = true
                    playerRef.current.loadVideoById({ videoId: freshId })
                    liveCheckTimeoutRef.current = setTimeout(() => {
                      if (isCheckingLiveRef.current) {
                        isCheckingLiveRef.current = false
                        switchToFallbackRef.current()
                      }
                    }, 12000)
                  } else {
                    switchToFallbackRef.current()
                  }
                }).catch(() => switchToFallbackRef.current())
              } else {
                switchToFallbackRef.current()
              }
            } else if (isCheckingLiveRef.current) {
              clearTimeout(liveCheckTimeoutRef.current)
              isCheckingLiveRef.current = false
              if (playerRef.current && temple.fallbackVideoId)
                playerRef.current.loadVideoById({ videoId: temple.fallbackVideoId, startSeconds: temple.fallbackStartAt || 0 })
            } else if (isOnFallbackRef.current && playerRef.current && temple.fallbackVideoId) {
              playerRef.current.seekTo(temple.fallbackStartAt || 0, true)
              playerRef.current.playVideo()
            }
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState
            if (e.data === S.ENDED) {
              if (!isOnFallbackRef.current) switchToFallbackRef.current()
              else if (playerRef.current) { playerRef.current.seekTo(temple.fallbackStartAt || 0, true); playerRef.current.playVideo() }
            }
            if (e.data === S.PLAYING && isCheckingLiveRef.current) {
              clearTimeout(liveCheckTimeoutRef.current)
              isCheckingLiveRef.current = false
              isOnFallbackRef.current = false
              setIsOnFallback(false)
            }
          },
        },
      })
      playerRef.current = p
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script')
        tag.id = 'yt-api-script'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); createPlayer() }
    }
    return () => {
      clearTimeout(liveCheckTimeoutRef.current)
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
  }, [temple.id, temple.liveVideoId]) // eslint-disable-line

  // ── Auto-fetch fresh live ID on open (3 s after mount, native only)
  // Covers both official-channel temples (channelHandle) and livebhagwan-sourced ones.
  // Switches the player silently if a newer ID is found — no fallback involved.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (isOnFallbackRef.current || !playerRef.current) return
      const isNative = window.Capacitor?.isNativePlatform?.() || false
      if (!isNative) return

      let freshId = null
      const ytHeaders = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      }

      try {
        if (temple.channelHandle) {
          // Official temple channel — /live page gives the current stream ID
          freshId = await fetchLatestLiveVideoId(temple.channelHandle)
        } else if (temple.livebhagwanChannel) {
          // livebhagwan-sourced temples — scrape their YouTube streams page
          const resp = await fetch(`https://www.youtube.com/@${temple.livebhagwanChannel}/streams`, { headers: ytHeaders })
          if (resp.ok) {
            const html = await resp.text()
            if (temple.livebhagwanKeyword) {
              const kw  = temple.livebhagwanKeyword.toLowerCase()
              const idx = html.toLowerCase().indexOf(kw)
              if (idx !== -1) {
                const seg = html.substring(Math.max(0, idx - 3000), idx)
                const ms  = [...seg.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)]
                freshId = ms.length ? ms[ms.length - 1][1] : null
              }
            } else {
              const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
              freshId = m ? m[1] : null
            }
          }
        }
      } catch {}

      if (freshId && freshId !== temple.liveVideoId && playerRef.current && !isOnFallbackRef.current) {
        playerRef.current.loadVideoById({ videoId: freshId })
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [temple.id]) // eslint-disable-line

  // ── Retry live every 15 min
  useEffect(() => {
    if (!isOnFallback || !temple.liveVideoId) return
    const tryLive = async () => {
      if (!playerRef.current || isCheckingLiveRef.current) return
      let liveId = temple.channelHandle ? await fetchLatestLiveVideoId(temple.channelHandle) : null
      if (!liveId) liveId = temple.liveVideoId
      isCheckingLiveRef.current = true
      playerRef.current.loadVideoById({ videoId: liveId })
      liveCheckTimeoutRef.current = setTimeout(() => {
        if (isCheckingLiveRef.current) {
          isCheckingLiveRef.current = false
          if (playerRef.current && temple.fallbackVideoId)
            playerRef.current.loadVideoById({ videoId: temple.fallbackVideoId, startSeconds: temple.fallbackStartAt || 0 })
        }
      }, 12000)
    }
    const iv = setInterval(tryLive, 15 * 60 * 1000)
    return () => clearInterval(iv)
  }, [isOnFallback, temple.liveVideoId, temple.fallbackVideoId, temple.fallbackStartAt, temple.channelHandle])

  // ── Dark screen auto-fallback (Vadatal only)
  // 30s timer — if stream is live but showing a dark/static screen, switch to fallback
  useEffect(() => {
    if (!temple.checkDarkScreen) return
    const t = setTimeout(() => {
      if (!isOnFallbackRef.current) switchToFallbackRef.current()
    }, 30000)
    return () => clearTimeout(t)
  }, [temple.checkDarkScreen]) // eslint-disable-line

  // ── Stall detection for all temples
  // Checks every 15s. Requires 2 consecutive non-advancing readings (~30s total) before
  // switching to fallback — avoids false triggers from brief buffering pauses.
  useEffect(() => {
    stallRef.current = { lastTime: -1, stallCount: 0 }
    const iv = setInterval(() => {
      if (!playerRef.current || isOnFallbackRef.current) return
      try {
        const state = playerRef.current.getPlayerState()
        if (state !== 1) {
          // Reset when not playing (buffering, paused, etc.)
          stallRef.current.stallCount = 0
          stallRef.current.lastTime = -1
          return
        }
        const t = playerRef.current.getCurrentTime()
        if (stallRef.current.lastTime >= 0 && Math.abs(t - stallRef.current.lastTime) < 0.5) {
          stallRef.current.stallCount++
          if (stallRef.current.stallCount >= 2) {
            switchToFallbackRef.current()
          }
        } else {
          stallRef.current.stallCount = 0
        }
        stallRef.current.lastTime = t
      } catch {}
    }, 15000)
    return () => clearInterval(iv)
  }, [temple.id]) // eslint-disable-line

  // ── Resume playback when app comes back to foreground (fixes audio drop)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setTimeout(() => {
        try {
          if (!playerRef.current) return
          const state = playerRef.current.getPlayerState()
          // -1 = unstarted, 2 = paused
          if (state === -1 || state === 2) playerRef.current.playVideo()
        } catch {}
      }, 800)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── Visual stasis detection (native pixel hash, every 17 min)
  // Captures an 8×8 pixel hash of the video region, waits 40 s, captures again.
  // If the hashes are identical the stream is visually frozen → switch to fallback.
  useEffect(() => {
    const isNative = window.Capacitor?.isNativePlatform?.() || false
    if (!isNative) return

    const doVisualCheck = async () => {
      if (visualCheckRef.current || isOnFallbackRef.current) return
      visualCheckRef.current = true
      try {
        const r1 = await ScreenAnalyzer.captureHash()
        const h1 = r1?.hash
        if (!h1 || h1 === 'unsupported' || h1 === 'zero' || h1.startsWith('err') || h1.startsWith('fail')) return

        // Wait 40 s then compare
        await new Promise(res => setTimeout(res, 40000))
        if (isOnFallbackRef.current) return

        const r2 = await ScreenAnalyzer.captureHash()
        const h2 = r2?.hash
        if (!h2 || h2.startsWith('err') || h2.startsWith('fail')) return

        if (h1 === h2) {
          // Pixels unchanged for 40 s → visually static → fallback
          switchToFallbackRef.current()
        }
      } catch {}
      finally { visualCheckRef.current = false }
    }

    // First check after 2 min (let stream settle), then every 17 min
    const t  = setTimeout(doVisualCheck, 2 * 60 * 1000)
    const iv = setInterval(doVisualCheck, 17 * 60 * 1000)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [temple.id]) // eslint-disable-line

  // ── Toggle mute
  const toggleMute = () => {
    if (!playerRef.current) return
    if (muted) { playerRef.current.unMute(); playerRef.current.setVolume(80); setMuted(false) }
    else { playerRef.current.mute(); setMuted(true) }
  }

  // ── Front camera
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(s => { streamRef.current = s; if (cameraRef.current) cameraRef.current.srcObject = s })
      .catch(() => setCameraError(true))
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // ── Fake chat
  useEffect(() => {
    const add = () => {
      setChatMessages(prev => [...prev.slice(-40), { id: Date.now() + Math.random(), name: pick(FAKE_NAMES), text: pick(CHAT_MESSAGES) }])
      setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 60)
    }
    add()
    const ivs = [setInterval(add, rnd(1200, 2800)), setInterval(add, rnd(2200, 4200))]
    return () => ivs.forEach(clearInterval)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setViewers(v => Math.max(5000, v + rnd(-40, 60))), 3500)
    return () => clearInterval(iv)
  }, [])

  const sendPreset = (text) => {
    setChatMessages(prev => [...prev.slice(-40), { id: Date.now(), name: 'आप', text, isMe: true }])
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 60)
  }
  const sendUserMsg = () => { const t = chatInput.trim(); if (!t) return; sendPreset(t); setChatInput('') }

  // ── Donation — tries Firebase Function first, falls back to direct Cashfree API
  const initiateDonation = async (amount) => {
    setDonateLoading(true); setDonateOpen(false)
    try {
      let orderId, checkoutUrl

      // Preferred path: Firebase Function (credentials stay server-side)
      if (createDonationOrderFn) {
        try {
          const result = await createDonationOrderFn({
            amount, templeId: temple.id, templeName: temple.nameHindi,
          })
          orderId     = result.data.orderId
          checkoutUrl = result.data.checkoutUrl
        } catch { /* function not deployed yet — fall through */ }
      }

      // Fallback: call Cashfree API directly from the app
      if (!orderId) {
        orderId = `bhaktdwaar${temple.id}t${Date.now()}`
        const res = await fetch(`${CF_BASE}/pg/orders`, {
          method: 'POST',
          headers: {
            'Content-Type':    'application/json',
            'x-client-id':     CF_APP_ID,
            'x-client-secret': CF_SECRET,
            'x-api-version':   '2023-08-01',
          },
          body: JSON.stringify({
            order_id: orderId, order_amount: amount, order_currency: 'INR',
            customer_details: {
              customer_id: 'bhakt001', customer_name: 'Devotee',
              customer_email: 'devotee@bhaktdwaar.app', customer_phone: '0000000000',
            },
            order_meta:  { return_url: `https://bhakti.vaomi.org/?order_id=${orderId}` },
            order_note:  `Donation to ${temple.nameHindi}`,
          }),
        })
        const body = await res.json()
        if (!body.payment_session_id) throw new Error(body.message || 'Order creation failed')
        checkoutUrl = `${CF_BASE}/checkout/?pt=${encodeURIComponent(body.payment_session_id)}`
      }

      const isNative = window.Capacitor?.isNativePlatform?.() || false
      if (isNative) {
        const { Browser } = await import('@capacitor/browser')
        let bl = await Browser.addListener('browserFinished', async () => {
          bl?.remove()
          setTimeout(() => { try { playerRef.current?.playVideo() } catch {} }, 400)

          // 2 s grace period for Cashfree to process
          await new Promise(r => setTimeout(r, 2000))

          let paid = false
          try {
            if (verifyDonationFn) {
              const vr = await verifyDonationFn({ orderId })
              paid = vr.data.paid
            } else {
              // Fallback: verify directly via Cashfree
              const vr  = await fetch(`${CF_BASE}/pg/orders/${orderId}`, {
                headers: { 'x-client-id': CF_APP_ID, 'x-client-secret': CF_SECRET, 'x-api-version': '2023-08-01' },
              })
              const order = await vr.json()
              paid = order.order_status === 'PAID'
            }
          } catch { /* network error — don't show false success */ }

          if (paid) {
            setDonateSuccessAmount(amount)
            setTimeout(() => setDonateSuccessAmount(null), 5500)
          } else {
            setDonateSuccess('भुगतान पूर्ण नहीं हुआ। पुनः प्रयास करें 🙏')
            setTimeout(() => setDonateSuccess(null), 4000)
          }
        })
        await Browser.open({ url: checkoutUrl, toolbarColor: '#0A3A12' })
      } else {
        window.open(checkoutUrl, '_blank')
      }
    } catch (err) {
      setDonateSuccess(`त्रुटि: ${err.message}`)
      setTimeout(() => setDonateSuccess(null), 4000)
    } finally { setDonateLoading(false) }
  }

  // ── Draggable camera
  const onCamTouchStart = (e) => {
    const t = e.touches[0], rect = e.currentTarget.getBoundingClientRect()
    camDragRef.current = { sx: t.clientX, sy: t.clientY, ex: rect.left, ey: rect.top }
  }
  const onCamTouchMove = (e) => {
    e.preventDefault()
    if (!camDragRef.current) return
    const t = e.touches[0]
    setCamPos({
      x: Math.max(0, Math.min(window.innerWidth - 82, camDragRef.current.ex + (t.clientX - camDragRef.current.sx))),
      y: Math.max(0, Math.min(window.innerHeight - 116, camDragRef.current.ey + (t.clientY - camDragRef.current.sy))),
    })
  }
  const onCamTouchEnd = () => { camDragRef.current = null }

  const FF = "'Noto Sans Devanagari', serif"

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D0200', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ══════════ HEADER (above video) ══════════ */}
      <div style={{
        height: HEADER_H, flexShrink: 0,
        background: 'linear-gradient(180deg, #150500 0%, #0D0200 100%)',
        borderBottom: '1px solid rgba(255,120,0,0.18)',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10, width: 38, height: 38, color: '#fff', fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>←</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {temple.emoji} {temple.nameHindi}
          </div>
          <div style={{ fontFamily: FF, fontSize: 11, color: 'rgba(255,200,120,0.75)' }}>
            {temple.locationHindi}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <div style={{
            background: isOnFallback ? '#856404' : '#CC0000',
            borderRadius: 5, padding: '3px 8px',
            fontSize: 10, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "'Poppins',sans-serif",
          }}>
            <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
            {isOnFallback ? 'VIDEO' : 'LIVE'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: "'Poppins',sans-serif" }}>
            👁 {viewers.toLocaleString('hi-IN')}
          </div>
        </div>

        <button onClick={toggleMute} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10, width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: '#fff', flexShrink: 0,
        }}>{muted ? '🔇' : '🔊'}</button>
      </div>

      {/* ══════════ VIDEO (16:9, full width, below header) ══════════ */}
      <div style={{ width: '100%', paddingTop: '56.25%', position: 'relative', flexShrink: 0, background: '#000' }}>
        <div ref={playerDivRef} style={{ position: 'absolute', inset: 0 }} />
        {/* Fade into bottom panel */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to top, #0D0200, transparent)', pointerEvents: 'none' }} />
      </div>

      {/* ══════════ BOTTOM PANEL ══════════ */}
      <div style={{ flex: 1, background: '#0D0200', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Chat (scrollable) */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {chatMessages.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', alignSelf: m.isMe ? 'flex-end' : 'flex-start' }}>
              {!m.isMe && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg, ${temple.accent || '#FF6B00'}, #CC0000)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 2 }}>🙏</div>
              )}
              <div style={{ background: m.isMe ? 'rgba(255,140,0,0.88)' : 'rgba(0,0,0,0.62)', borderRadius: m.isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '4px 10px', maxWidth: 240, backdropFilter: 'blur(6px)' }}>
                {!m.isMe && <div style={{ fontFamily: FF, fontSize: 10, color: '#FFD700', fontWeight: 700, marginBottom: 1 }}>{m.name}</div>}
                <div style={{ fontFamily: FF, fontSize: 13, color: '#fff', lineHeight: 1.35 }}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Preset chips */}
        <div style={{ display: 'flex', gap: 6, padding: '3px 12px', overflowX: 'auto' }}>
          {PRESET_MSGS.map((msg, i) => (
            <button key={i} onClick={() => sendPreset(msg)} style={{
              background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 18, padding: '5px 12px', color: '#fff',
              fontFamily: FF, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
            }}>{msg}</button>
          ))}
        </div>

        {/* Chat input */}
        <div style={{ display: 'flex', gap: 7, padding: '3px 12px' }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendUserMsg() }}
            placeholder="अपना संदेश लिखें..."
            style={{ flex: 1, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 18, padding: '8px 14px', color: '#fff', fontSize: 13, fontFamily: FF, outline: 'none' }}
          />
          <button onClick={sendUserMsg} style={{ background: 'rgba(255,140,0,0.85)', border: 'none', borderRadius: 18, padding: '8px 15px', color: '#fff', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
        </div>

        {/* Donate + Bell */}
        <div style={{ display: 'flex', gap: 9, padding: '5px 12px 20px', alignItems: 'center' }}>
          <button onClick={() => setDonateOpen(true)} style={{
            flex: 1,
            background: 'linear-gradient(135deg, #0A3A12 0%, #1E7A30 45%, #0A3A12 100%)',
            border: '1.5px solid rgba(80,200,110,0.45)',
            borderRadius: 16, padding: '12px 12px',
            color: '#FFD700', fontWeight: 800, fontFamily: FF,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            boxShadow: '0 4px 20px rgba(20,120,50,0.55), inset 0 1px 0 rgba(180,255,180,0.12)',
            animation: 'donatePulse 3.5s ease-in-out infinite',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 16, letterSpacing: 0.3 }}>
              <span>🪔</span>
              <span>दान / दक्षिणा</span>
              <span>🪔</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,215,0,0.72)', fontWeight: 500, letterSpacing: 0.8 }}>
              मनोकामना पूर्ण करें
            </div>
          </button>

          <button onClick={ringBell} style={{
            width: 54, height: 54, borderRadius: 14, flexShrink: 0,
            background: bellAnimating ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.10)',
            border: bellAnimating ? '1.5px solid rgba(255,215,0,0.6)' : '1px solid rgba(255,255,255,0.2)',
            fontSize: 24, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s, border 0.3s',
          }}>🔔</button>
        </div>
      </div>

      {/* ══════════ DRAGGABLE CAMERA PiP ══════════ */}
      <div
        onTouchStart={onCamTouchStart}
        onTouchMove={onCamTouchMove}
        onTouchEnd={onCamTouchEnd}
        style={{
          position: 'fixed',
          left: camPos.x, top: camPos.y,
          width: 80, height: 108,
          borderRadius: 12, overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.28)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          zIndex: 50, background: '#111',
          touchAction: 'none', cursor: 'grab',
        }}
      >
        {cameraError ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 22 }}>🙏</span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '0 3px', fontFamily: FF }}>कैमरा उपलब्ध नहीं</span>
          </div>
        ) : (
          <video ref={cameraRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '2px 4px', fontFamily: FF, fontSize: 7.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
          आप 🙏
        </div>
      </div>

      {/* ══════════ WISH BUTTON — right below camera PiP, follows on drag ══════════ */}
      {!wishPhase && (
        <button
          onClick={startWish}
          style={{
            position: 'fixed',
            left: camPos.x - 2,
            top: camPos.y + 112,
            width: 84,
            zIndex: 60,
            borderRadius: '0 0 12px 12px',
            padding: '6px 0',
            background: 'linear-gradient(180deg, #4B16A8, #8A1E78)',
            border: '2px solid rgba(255,215,0,0.32)',
            borderTop: 'none',
            boxShadow: '0 6px 18px rgba(120,20,200,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            animation: 'wishPulse 2.8s ease-in-out infinite',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>🎙️</span>
          <span style={{ fontFamily: FF, fontSize: 9, color: '#FFD700', fontWeight: 800, letterSpacing: 0.3 }}>इच्छा बोलें</span>
        </button>
      )}

      {/* Bell burst */}
      {bellAnimating && (
        <div style={{ position: 'fixed', bottom: '30%', left: '50%', transform: 'translateX(-50%)', fontSize: 68, zIndex: 200, animation: 'bellFloat 2.2s ease-out forwards', pointerEvents: 'none' }}>🔔</div>
      )}

      {/* ══════════ DONATE MODAL ══════════ */}
      {donateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'flex-end', zIndex: 100, backdropFilter: 'blur(5px)' }}
          onClick={() => !donateLoading && setDonateOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'linear-gradient(180deg, #1A0800, #0D0400)', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,140,0,0.3)', padding: '24px 20px 38px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36 }}>🪔</div>
              <h3 style={{ fontFamily: FF, fontSize: 22, fontWeight: 700, color: '#FFD700', marginTop: 8 }}>दान / दक्षिणा</h3>
              <p style={{ fontFamily: FF, fontSize: 14, color: 'rgba(255,220,150,0.65)', marginTop: 5 }}>{temple.nameHindi} को आपका दान पहुँचेगा</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              {DONATE_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => !donateLoading && initiateDonation(amt)} disabled={donateLoading} style={{
                  background: donateLoading ? 'rgba(255,140,0,0.06)' : 'rgba(255,140,0,0.14)',
                  border: '1px solid rgba(255,140,0,0.4)',
                  borderRadius: 12, padding: '13px 0',
                  color: '#FFD700', fontWeight: 700, fontSize: 15,
                  fontFamily: "'Poppins', sans-serif",
                  opacity: donateLoading ? 0.5 : 1,
                }}>₹{amt}</button>
              ))}
            </div>
            {donateLoading && <div style={{ textAlign: 'center', padding: '10px', fontFamily: FF, color: 'rgba(255,215,0,0.8)', fontSize: 14 }}>भुगतान लिंक बन रहा है... 🙏</div>}
            <button onClick={() => !donateLoading && setDonateOpen(false)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '13px', fontFamily: FF, color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 4 }}>रद्द करें</button>
          </div>
        </div>
      )}

      {/* ══════════ DONATION SUCCESS — full-screen ══════════ */}
      {donateSuccessAmount && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'blessingFade 0.5s ease-out forwards' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${temple.image})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'brightness(0.22) blur(7px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 38%, rgba(255,140,0,0.18) 0%, rgba(0,0,0,0.88) 100%)' }} />
          <div style={{ position: 'relative', textAlign: 'center', padding: '0 32px' }}>
            <div style={{ fontSize: 70, marginBottom: 10, filter: 'drop-shadow(0 0 28px #FF8C00) drop-shadow(0 0 56px #FFD700)', animation: 'omGlow 2s ease-in-out infinite' }}>🪔</div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 48, fontWeight: 900, color: '#FFD700', textShadow: '0 0 36px rgba(255,215,0,0.8)', lineHeight: 1, marginBottom: 8 }}>
              ₹{donateSuccessAmount}
            </div>
            <div style={{ fontFamily: FF, fontSize: 25, fontWeight: 900, color: '#FFD700', textShadow: '0 0 28px rgba(255,215,0,0.8)', lineHeight: 1.35, marginBottom: 8 }}>
              दान स्वीकार हुआ 🙏
            </div>
            <div style={{ fontFamily: FF, fontSize: 15, color: '#FFE88A', lineHeight: 1.6, marginBottom: 16 }}>
              {temple.nameHindi} को आपका दान<br />पहुँच गया
            </div>
            <div style={{ fontFamily: FF, fontSize: 14, color: 'rgba(255,215,0,0.65)' }}>✨ भगवान आपका कल्याण करें ✨</div>
          </div>
        </div>
      )}

      {/* Small toast for errors only */}
      {donateSuccess && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,10,0,0.95)', border: '1px solid rgba(255,100,100,0.4)', borderRadius: 12, padding: '12px 22px', textAlign: 'center', zIndex: 200, maxWidth: 280 }}>
          <div style={{ fontFamily: FF, fontSize: 14, color: '#FFA0A0' }}>{donateSuccess}</div>
        </div>
      )}

      {/* ══════════ RECORDING OVERLAY ══════════ */}
      {wishPhase === 'recording' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(ellipse at center, #100028 0%, #000010 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 300,
        }}>
          {/* OM — large, glowing gold */}
          <div style={{
            fontFamily: 'serif',
            fontSize: 128,
            lineHeight: 1,
            color: '#FFD700',
            textShadow: '0 0 60px rgba(255,215,0,0.95), 0 0 120px rgba(255,160,0,0.6), 0 0 200px rgba(255,80,0,0.3)',
            marginBottom: 22,
            animation: 'omGlow 2.5s ease-in-out infinite',
            userSelect: 'none',
          }}>ॐ</div>

          {/* Recording indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF2222', boxShadow: '0 0 8px #FF2222', animation: 'pulse 0.9s infinite', flexShrink: 0 }} />
            <div style={{ fontFamily: FF, fontSize: 19, fontWeight: 700, color: '#E8C8FF', letterSpacing: 0.3 }}>
              रिकॉर्डिंग हो रही है...
            </div>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🎙️</span>
          </div>

          <div style={{ fontFamily: FF, fontSize: 14, color: 'rgba(255,255,255,0.50)', marginBottom: 16 }}>
            भगवान सुन रहे हैं — {wishSec} सेकंड शेष
          </div>

          <button onClick={stopWish} style={{
            background: 'linear-gradient(135deg, rgba(255,100,20,0.30), rgba(180,50,255,0.22))',
            border: '1.5px solid rgba(255,140,50,0.55)',
            borderRadius: 26, padding: '14px 44px',
            fontFamily: FF, fontSize: 17, color: '#FFD4A0', fontWeight: 700,
            boxShadow: '0 4px 20px rgba(255,120,0,0.25)',
          }}>✓ इच्छा भेजें</button>
        </div>
      )}

      {/* ══════════ BLESSING + TRANSCRIPTION OVERLAY ══════════ */}
      {wishPhase === 'blessing' && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 300, animation: 'blessingFade 0.6s ease-out forwards',
        }}>
          {/* Temple image blurred background */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${temple.image})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'brightness(0.35) blur(4px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.78) 100%)' }} />

          <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px', width: '100%', maxWidth: 380 }}>
            {/* Temple deity emoji — glowing */}
            <div style={{ fontSize: 78, marginBottom: 14, filter: 'drop-shadow(0 0 30px gold) drop-shadow(0 0 60px orange)' }}>
              {temple.emoji}
            </div>

            {/* Main blessing text */}
            <div style={{ fontFamily: FF, fontSize: 26, fontWeight: 900, color: '#FFD700', textShadow: '0 0 40px rgba(255,215,0,0.9), 0 2px 8px rgba(0,0,0,0.95)', lineHeight: 1.4, marginBottom: 10 }}>
              आपकी इच्छा<br />भगवान ने सुन ली 🙏
            </div>
            <div style={{ fontFamily: FF, fontSize: 18, color: '#FFE88A', textShadow: '0 0 20px rgba(255,200,0,0.7)', lineHeight: 1.5, marginBottom: 22 }}>
              आपकी मनोकामना अवश्य पूर्ण होगी ✨
            </div>

            {/* ── TRANSCRIPTION BOX — prominent ── */}
            <div style={{
              background: 'rgba(0,0,0,0.60)',
              border: '1.5px solid rgba(255,215,0,0.35)',
              borderRadius: 18, padding: '14px 18px',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 0 24px rgba(255,215,0,0.12)',
            }}>
              <div style={{ fontFamily: FF, fontSize: 12, color: '#FFD700', fontWeight: 700, marginBottom: 8, opacity: 0.85 }}>
                🎙️ आपकी इच्छा:
              </div>

              {wishTranscript === 'loading' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '4px 0' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#C090FF', animation: `dotBounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: FF, fontSize: 13, color: 'rgba(200,170,255,0.85)' }}>समझ रहे हैं...</span>
                </div>
              ) : wishTranscript ? (
                <>
                  <div style={{ fontFamily: FF, fontSize: 17, color: '#fff', lineHeight: 1.55, fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    "{wishTranscript}"
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 13, color: 'rgba(255,215,0,0.75)', marginTop: 10 }}>
                    ✨ यह इच्छा पूरी होगी — भगवान का वचन
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: FF, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                  आपकी भावना भगवान तक पहुँच गई 🙏
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes omGlow {
          0%,100% { text-shadow: 0 0 60px rgba(255,215,0,0.95), 0 0 120px rgba(255,160,0,0.6); }
          50%      { text-shadow: 0 0 90px rgba(255,215,0,1), 0 0 180px rgba(255,140,0,0.8), 0 0 260px rgba(255,80,0,0.4); }
        }
        @keyframes bellFloat {
          0%   { opacity:1; transform:translateX(-50%) scale(0.6); }
          30%  { opacity:1; transform:translateX(-50%) scale(1.1); }
          100% { opacity:0; transform:translateX(-50%) translateY(-100px) scale(0.7); }
        }
        @keyframes blessingFade { 0%{opacity:0} 100%{opacity:1} }
        @keyframes dotBounce {
          0%,80%,100% { transform:scale(0.7); opacity:0.5; }
          40%          { transform:scale(1.2); opacity:1; }
        }
        @keyframes wishPulse {
          0%,100% { box-shadow: 0 4px 22px rgba(140,30,220,0.55); }
          50%      { box-shadow: 0 4px 32px rgba(140,30,220,0.85), 0 0 0 8px rgba(140,30,220,0.12); }
        }
        @keyframes donatePulse {
          0%,100% { box-shadow: 0 4px 20px rgba(20,120,50,0.55); }
          50%      { box-shadow: 0 4px 30px rgba(30,180,70,0.75), 0 0 0 4px rgba(30,180,70,0.12); }
        }
        input::placeholder { color:rgba(255,255,255,0.30); }
      `}</style>
    </div>
  )
}
