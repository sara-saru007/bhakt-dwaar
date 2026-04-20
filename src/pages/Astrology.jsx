import { useNavigate } from 'react-router-dom'

export default function Astrology() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #050520 0%, #0D0400 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(100,100,255,0.15)',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(100,100,255,0.12)', border: '1px solid rgba(100,100,255,0.25)',
          borderRadius: 10, width: 38, height: 38,
          color: '#9090FF', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFF5E4' }}>⭐ Astrology</h2>
      </div>

      {/* Coming Soon */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', textAlign: 'center',
      }}>
        {/* Stars */}
        <div style={{ fontSize: 64, marginBottom: 8, lineHeight: 1, animation: 'starFloat 3s ease-in-out infinite' }}>🔭</div>

        <div style={{ position: 'relative', marginBottom: 24 }}>
          <div style={{
            fontSize: 11, letterSpacing: 6, color: 'rgba(150,150,255,0.7)',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Coming Soon</div>
          <h1 style={{
            fontSize: 32, fontWeight: 900,
            background: 'linear-gradient(135deg, #7B8FFF, #C8A0FF, #FF8CF0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Cosmic Guidance<br />Awaits You</h1>
        </div>

        <p style={{ fontSize: 14, color: 'rgba(255,245,228,0.6)', lineHeight: 1.8, maxWidth: 300, marginBottom: 32 }}>
          Our team of expert Jyotishis is preparing personalized astrological readings, kundli matching, and cosmic remedies just for you.
        </p>

        {/* Feature teasers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          {[
            { icon: '♈', label: 'Janma Kundli (Birth Chart)', sub: 'Personalized vedic horoscope' },
            { icon: '💑', label: 'Kundli Matching', sub: 'For auspicious marriages' },
            { icon: '🪐', label: 'Navgraha Report', sub: 'Planetary influence analysis' },
            { icon: '💎', label: 'Gemstone Recommendations', sub: 'Based on your birth chart' },
          ].map((f, i) => (
            <div key={i} style={{
              background: 'rgba(100,100,255,0.07)',
              border: '1px solid rgba(100,100,255,0.18)',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              textAlign: 'left', opacity: 0.8,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(100,100,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#C8C8FF' }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,200,255,0.5)', marginTop: 2 }}>{f.sub}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(150,150,255,0.5)' }}>Soon</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, fontSize: 12, color: 'rgba(200,200,255,0.35)' }}>
          🌙 As above, so below 🌙
        </div>
      </div>

      <style>{`
        @keyframes starFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
      `}</style>
    </div>
  )
}
