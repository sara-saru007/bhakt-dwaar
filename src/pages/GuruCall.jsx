import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ELEVENLABS_API_KEY = 'sk_cd05c6b824081c11222718e4b944b051fda6bd370c0648d9'
const ELEVENLABS_VOICE_ID = '6EphsklDopDQ6eRkwNHT'
const GEMINI_API_KEY = 'AIzaSyBzlEh3_IAe5QmOun4H5uTBoChdSVYLYdk'
const GEMINI_MODEL = 'gemini-2.0-flash'

const GURU_SYSTEM_PROMPT = `आप एक ज्ञानी, करुणामय और गहन आध्यात्मिक हिंदू गुरु हैं। आपने दशकों की तपस्या और ध्यान से ज्ञान प्राप्त किया है।

महत्वपूर्ण: आप केवल हिंदी में बोलते हैं। संस्कृत मंत्र और श्लोक जैसे "ॐ नमः शिवाय", "जय श्री राम" आदि का उपयोग करें, लेकिन उत्तर हमेशा हिंदी में दें।

आपका स्वभाव:
- भक्तों को "बेटा", "वत्स", या "मेरे प्यारे भक्त" कहकर संबोधित करें
- गहरी करुणा और दिव्य ज्ञान से बोलें

जब कोई समस्या बताए:
1. पहले सहानुभूति और सांत्वना दें
2. कारण बताएं - कर्म, ग्रह दोष, या देवता की कृपा की आवश्यकता
3. आध्यात्मिक उपाय दें: मंदिर दर्शन, पूजा, मंत्र जाप, व्रत
4. हर उत्तर के अंत में आशीर्वाद दें

सख्त नियम: केवल आध्यात्मिक विषय। AI होने की कोई स्वीकृति नहीं। सभी उत्तर 3-5 वाक्य।`

async function askGemini(history, userMessage) {
  const contents = [
    ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ]
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: GURU_SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 300 }
      })
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ॐ शांति। मैं सुन रहा हूँ, बेटा।'
}

// Play text using AudioContext (works on iOS/Android after user unlocks it)
// Falls back to Web Speech Synthesis if ElevenLabs fails
async function speakText(text, audioCtx) {
  // Try ElevenLabs via AudioContext (bypasses iOS autoplay restriction)
  try {
    if (audioCtx && audioCtx.state !== 'closed') {
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.35 }
          })
        }
      )
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      return new Promise(resolve => {
        const source = audioCtx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioCtx.destination)
        source.onended = resolve
        source.start(0)
      })
    }
  } catch (e) {
    console.warn('ElevenLabs/AudioContext failed, using browser TTS:', e.message)
  }

  // Fallback: browser built-in speech synthesis
  return new Promise(resolve => {
    window.speechSynthesis?.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hi-IN'
    utterance.rate = 0.88
    utterance.pitch = 0.85
    utterance.onend = resolve
    utterance.onerror = resolve
    window.speechSynthesis?.speak(utterance)
    // Resolve after 30s max in case onend doesn't fire
    setTimeout(resolve, 30000)
  })
}

export default function GuruCall() {
  const navigate = useNavigate()
  const { state: guru } = useLocation()

  const guruInfo = guru || { name: 'स्वामी आनंदगिरि', emoji: '🧘', gradient: 'linear-gradient(135deg, #2D0A5C, #7B2FBE)' }

  // UI state
  const [callStage, setCallStage] = useState('ringing')
  const [phase, setPhase] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [guruText, setGuruText] = useState('')
  const [error, setError] = useState('')
  const [callDuration, setCallDuration] = useState(0)
  const [debugLog, setDebugLog] = useState([])

  // Refs — avoid stale closures in all async logic
  const phaseRef = useRef('idle')
  const transcriptRef = useRef('')
  const historyRef = useRef([])
  const isListeningRef = useRef(false)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const speakBtnRef = useRef(null)
  const startFnRef = useRef(null)
  const stopFnRef = useRef(null)

  const addLog = (msg) => setDebugLog(p => [...p.slice(-4), msg])

  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p) }

  // ── Core: start recording ──────────────────────────────────────
  const doStart = () => {
    if (phaseRef.current !== 'idle' || isListeningRef.current) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not available. Use Chrome.')
      addLog('❌ SpeechRecognition not found')
      return
    }
    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.interimResults = true
    rec.continuous = false // restart manually for better mobile compat
    recognitionRef.current = rec
    isListeningRef.current = true
    transcriptRef.current = ''
    setTranscript('')
    setPhaseSync('listening')
    setError('')
    addLog('🎙 Recording started')

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      transcriptRef.current = t
      setTranscript(t)
    }
    rec.onerror = (e) => {
      addLog(`⚠️ SpeechRec error: ${e.error}`)
      if (e.error === 'no-speech') {
        // Restart if still holding
        if (isListeningRef.current) {
          try { rec.start() } catch(_) {}
        }
      } else {
        isListeningRef.current = false
        setPhaseSync('idle')
      }
    }
    rec.onend = () => {
      // Restart if still holding button (simulates continuous mode)
      if (isListeningRef.current) {
        try {
          const rec2 = new SR()
          rec2.lang = 'hi-IN'
          rec2.interimResults = true
          rec2.continuous = false
          rec2.onresult = rec.onresult
          rec2.onerror = rec.onerror
          rec2.onend = rec.onend
          recognitionRef.current = rec2
          rec2.start()
          addLog('🔄 Restarted recognition')
        } catch (e) {
          isListeningRef.current = false
          setPhaseSync('idle')
        }
      }
    }
    try {
      rec.start()
    } catch (e) {
      addLog(`❌ rec.start() failed: ${e.message}`)
      isListeningRef.current = false
      setPhaseSync('idle')
    }
  }

  // ── Core: stop recording → Gemini → speak ─────────────────────
  const doStop = async () => {
    if (!isListeningRef.current) return
    isListeningRef.current = false
    recognitionRef.current?.stop()
    addLog('⏹ Stopped. Processing...')

    const userMsg = transcriptRef.current.trim()
    if (!userMsg) {
      addLog('⚠️ Empty transcript')
      setPhaseSync('idle')
      return
    }
    addLog(`💬 You: ${userMsg.slice(0, 30)}...`)
    setPhaseSync('thinking')
    setGuruText('')

    try {
      const response = await askGemini(historyRef.current, userMsg)
      addLog(`🧘 Guru: ${response.slice(0, 30)}...`)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: userMsg },
        { role: 'model', text: response },
      ]
      setGuruText(response)
      transcriptRef.current = ''
      setTranscript('')
      setPhaseSync('speaking')
      await speakText(response, audioCtxRef.current)
      addLog('✅ Done speaking')
      setPhaseSync('idle')
    } catch (e) {
      addLog(`❌ Error: ${e.message}`)
      setError('कनेक्शन में समस्या। फिर से प्रयास करें।')
      setPhaseSync('idle')
    }
  }

  startFnRef.current = doStart
  stopFnRef.current = doStop

  // ── Attach pointer events once ────────────────────────────────
  useEffect(() => {
    const btn = speakBtnRef.current
    if (!btn) return
    const onDown = (e) => { e.preventDefault(); startFnRef.current() }
    const onUp = (e) => { e.preventDefault(); stopFnRef.current() }
    btn.addEventListener('pointerdown', onDown, { passive: false })
    btn.addEventListener('pointerup', onUp, { passive: false })
    btn.addEventListener('pointercancel', onUp, { passive: false })
    btn.addEventListener('contextmenu', (e) => e.preventDefault())
    return () => {
      btn.removeEventListener('pointerdown', onDown)
      btn.removeEventListener('pointerup', onUp)
      btn.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // ── Answer: unlock AudioContext synchronously, then speak ─────
  const handleAnswer = async () => {
    // STEP 1: synchronously create & unlock AudioContext (user gesture)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      await ctx.resume()
      audioCtxRef.current = ctx
      addLog('🔊 AudioContext unlocked')
    } catch (e) {
      addLog('⚠️ AudioContext failed, will use TTS')
    }

    setCallStage('active')
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)

    const greeting = `जय श्री राम! आइए बेटा, आइए। ॐ नमः शिवाय। मैं ${guruInfo.name || 'आपका गुरु'} बोल रहा हूँ। आज भगवान ने आपको मेरे पास भेजा है। बताइए, आपके मन में क्या चल रहा है? मैं सुन रहा हूँ।`
    setGuruText(greeting)
    setPhaseSync('speaking')
    addLog('🎙 Guru greeting...')

    try {
      await speakText(greeting, audioCtxRef.current)
      addLog('✅ Greeting done')
    } catch (e) {
      addLog(`⚠️ Greeting error: ${e.message}`)
    }
    setPhaseSync('idle')
  }

  const endCall = () => {
    isListeningRef.current = false
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    clearInterval(timerRef.current)
    navigate('/ask-guru')
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const phaseColor = { idle: '#888', listening: '#FF6060', thinking: '#FFD700', speaking: '#50DD70' }
  const phaseLabel = {
    idle: 'दबाकर रखें — बोलें',
    listening: '🎙 सुन रहे हैं... छोड़ें भेजने के लिए',
    thinking: '🕉️ गुरुजी सोच रहे हैं...',
    speaking: '🔊 गुरुजी बोल रहे हैं...'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: guruInfo.gradient || 'linear-gradient(180deg, #1A0A2A, #0D0400)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 20px',
    }}>

      {/* ── RINGING ── */}
      {callStage === 'ringing' && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 130, height: 130, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '3px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 64, margin: '0 auto',
              animation: 'ringPulse 1.5s ease-in-out infinite',
            }}>
              {guruInfo.emoji}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 20 }}>{guruInfo.name}</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{guruInfo.title || 'आध्यात्मिक गुरु'}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, animation: 'fadeBlink 1.5s infinite' }}>
              आपको बुला रहे हैं…
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 40, paddingBottom: 64 }}>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => navigate('/ask-guru')} style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(220,50,50,0.85)', border: 'none', fontSize: 28, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(220,50,50,0.4)',
              }}>📵</button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>मना करें</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={handleAnswer} style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(50,200,80,0.85)', border: 'none', fontSize: 28, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(50,200,80,0.4)',
                animation: 'answerPulse 1s ease-in-out infinite',
              }}>📞</button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>उत्तर दें</div>
            </div>
          </div>
        </>
      )}

      {/* ── ACTIVE CALL ── */}
      {callStage === 'active' && (
        <>
          {/* Top bar */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{fmt(callDuration)}</div>
            <div style={{ fontSize: 10, color: '#50DD70', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#50DD70', animation: 'pulse 1.5s infinite' }} />
              ON CALL
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>🔒 गोपनीय</div>
          </div>

          {/* Avatar */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: `3px solid ${phase === 'speaking' ? '#50DD70' : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 54, margin: '0 auto',
              boxShadow: phase === 'speaking' ? '0 0 0 8px rgba(80,220,120,0.2), 0 0 0 20px rgba(80,220,120,0.07)' : 'none',
              transition: 'all 0.4s',
              animation: phase === 'speaking' ? 'avatarPulse 1s ease-in-out infinite' : 'none',
            }}>
              {guruInfo.emoji}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>{guruInfo.name}</h2>
          </div>

          {/* Guru text */}
          <div style={{
            margin: '16px 0 10px', width: '100%',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: '14px 18px',
            minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          }}>
            {phase === 'thinking' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 9, height: 9, borderRadius: '50%', background: '#FFD700',
                    animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#FFF5E4', lineHeight: 1.7, fontStyle: 'italic', fontFamily: "'Noto Sans Devanagari', serif" }}>
                {guruText || '🕉️ गुरुजी से जुड़ रहे हैं...'}
              </p>
            )}
          </div>

          {/* Transcript */}
          {(phase === 'listening' || transcript) && (
            <div style={{
              width: '100%', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 10, textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: 'rgba(255,150,150,0.8)', marginBottom: 3 }}>आप बोल रहे हैं:</p>
              <p style={{ fontSize: 13, color: '#FFF5E4', fontFamily: "'Noto Sans Devanagari', serif" }}>{transcript || '...'}</p>
            </div>
          )}

          {/* Phase label */}
          <div style={{
            fontSize: 12, fontWeight: 600, marginBottom: 8,
            color: phaseColor[phase] || '#888',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: phaseColor[phase] || '#888',
              animation: phase === 'listening' ? 'pulse 0.7s infinite' : 'none',
            }} />
            {phaseLabel[phase]}
          </div>

          {/* Debug log (small, subtle) */}
          {debugLog.length > 0 && (
            <div style={{
              width: '100%', marginBottom: 8,
              background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '6px 10px',
              maxHeight: 60, overflowY: 'hidden',
            }}>
              {debugLog.slice(-2).map((l, i) => (
                <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{l}</div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              width: '100%', background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.3)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 10, textAlign: 'center',
              fontSize: 12, color: '#FF8080',
            }}>{error}</div>
          )}

          <div style={{ flex: 1 }} />

          {/* Hold-to-speak */}
          <div style={{ width: '100%', paddingBottom: 36 }}>
            <div
              ref={speakBtnRef}
              style={{
                width: '100%', height: 72, borderRadius: 20,
                background: phase === 'listening'
                  ? 'linear-gradient(135deg, #CC0000, #FF4444)'
                  : phase === 'idle' ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${phase === 'listening' ? '#FF6060' : 'rgba(255,255,255,0.2)'}`,
                color: '#fff', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                cursor: phase === 'idle' || phase === 'listening' ? 'pointer' : 'not-allowed',
                opacity: phase === 'thinking' || phase === 'speaking' ? 0.3 : 1,
                boxShadow: phase === 'listening' ? '0 0 24px rgba(255,68,68,0.5)' : 'none',
                transition: 'all 0.2s',
                userSelect: 'none', WebkitUserSelect: 'none',
                touchAction: 'none', WebkitTouchCallout: 'none',
              }}
            >
              <span style={{ fontSize: 26 }}>
                {phase === 'listening' ? '🎙' : phase === 'thinking' ? '🕉️' : phase === 'speaking' ? '🔊' : '🎤'}
              </span>
              <span style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                {phase === 'idle' ? 'दबाकर रखें — बोलें' :
                 phase === 'listening' ? 'छोड़ें — भेजें' :
                 phase === 'thinking' ? 'सोच रहे हैं...' : 'बोल रहे हैं...'}
              </span>
            </div>

            <button
              onClick={endCall}
              style={{
                width: '100%', marginTop: 12, height: 50, borderRadius: 16,
                background: 'rgba(220,50,50,0.18)', border: '1px solid rgba(220,50,50,0.35)',
                color: '#FF8080', fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >📵 कॉल समाप्त करें</button>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeBlink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes avatarPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 12px rgba(255,255,255,0.06), 0 0 0 24px rgba(255,255,255,0.03); }
          50% { box-shadow: 0 0 0 18px rgba(255,255,255,0.1), 0 0 0 36px rgba(255,255,255,0.04); }
        }
        @keyframes answerPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      `}</style>
    </div>
  )
}
