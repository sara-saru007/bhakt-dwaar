import { useEffect, useState } from 'react'

const GREETINGS = [
  'जय श्री राम 🙏',
  'हर हर महादेव 🔱',
  'जय श्री कृष्ण 🪷',
  'ॐ नमः शिवाय 🕉️',
  'जय माता दी 🌸',
  'जय साईं राम ✨',
]

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in')
  // Pick one random greeting when app opens — stays fixed for this session
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 3200)
    const t3 = setTimeout(() => onDone(), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(ellipse at center, #3D1200 0%, #1A0500 50%, #0D0200 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.6s ease',
      opacity: phase === 'out' ? 0 : 1,
    }}>
      {/* Random greeting — chosen fresh each time app opens */}
      <div style={{
        fontFamily: "'Noto Sans Devanagari', serif",
        fontSize: 24, fontWeight: 700,
        color: '#FFD700',
        marginBottom: 32,
        transition: 'opacity 0.6s ease 0.3s',
        opacity: phase === 'in' ? 0 : 1,
        textShadow: '0 0 16px rgba(255,215,0,0.6)',
        letterSpacing: 1, textAlign: 'center',
      }}>
        {greeting}
      </div>

      {/* Om symbol */}
      <div style={{
        fontSize: 68, marginBottom: 14,
        transition: 'transform 0.6s ease, opacity 0.6s ease',
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'scale(0.5)' : 'scale(1)',
        animation: phase !== 'in' ? 'glowPulse 2s ease-in-out infinite' : 'none',
      }}>🕉️</div>

      {/* Bhakti in Hindi */}
      <h1 style={{
        fontFamily: "'Noto Sans Devanagari', serif",
        fontSize: 58, fontWeight: 900,
        background: 'linear-gradient(135deg, #FFD700, #FF8C00, #FF4500)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: 2,
        transition: 'transform 0.6s ease, opacity 0.6s ease',
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'translateY(30px)' : 'translateY(0)',
        lineHeight: 1.2, textAlign: 'center',
      }}>भक्त द्वार</h1>


      {/* Diyas row */}
      <div style={{
        display: 'flex', gap: 24, marginTop: 52,
        transition: 'opacity 0.6s ease 0.4s',
        opacity: phase === 'in' ? 0 : 1,
      }}>
        {['🪔', '🪔', '🪔'].map((d, i) => (
          <span key={i} style={{ fontSize: 30, filter: 'drop-shadow(0 0 10px #FF8C00)' }}>{d}</span>
        ))}
      </div>

      <style>{`
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 10px #FF8C00); }
          50% { filter: drop-shadow(0 0 28px #FFD700); }
        }
      `}</style>
    </div>
  )
}
