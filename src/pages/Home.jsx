import { useNavigate } from 'react-router-dom'

const cards = [
  {
    id: 'live-puja',
    emoji: '🏛️',
    title: 'Live Puja',
    subtitle: 'Watch & participate in live temple rituals',
    gradient: 'linear-gradient(135deg, #8B1A00 0%, #D44000 100%)',
    glow: '#D44000',
    route: '/live-puja',
  },
  {
    id: 'ask-guru',
    emoji: '🧘',
    title: 'Ask the Guru',
    subtitle: 'Seek divine guidance from our spiritual masters',
    gradient: 'linear-gradient(135deg, #1A4A1A 0%, #2E8B2E 100%)',
    glow: '#2E8B2E',
    route: '/ask-guru',
  },
  {
    id: 'astrology',
    emoji: '⭐',
    title: 'Astrology',
    subtitle: 'Discover your cosmic path & destiny',
    gradient: 'linear-gradient(135deg, #0A1A4A 0%, #1A3A8A 100%)',
    glow: '#1A3A8A',
    route: '/astrology',
  },
  {
    id: 'book-guruji',
    emoji: '📅',
    title: 'Book a Guruji Visit',
    subtitle: 'Schedule a pandit for your home puja',
    gradient: 'linear-gradient(135deg, #4A2800 0%, #8B5500 100%)',
    glow: '#8B5500',
    route: '/book-guruji',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A0800 0%, #0D0400 100%)' }}>
      {/* Header */}
      <div style={{
        padding: '32px 24px 16px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(255,107,0,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,140,0,0.15)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🕉️</div>
        <h1 style={{
          fontFamily: "'Noto Sans Devanagari', serif",
          fontSize: 30, fontWeight: 900,
          background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', letterSpacing: 2,
        }}>भक्त द्वार</h1>
        <p style={{ color: 'rgba(255,220,150,0.55)', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginTop: 2 }}>आपका आध्यात्मिक द्वार</p>
      </div>

      {/* Greeting */}
      <div style={{ padding: '20px 24px 8px' }}>
        <p style={{ color: 'rgba(255,245,228,0.5)', fontSize: 12 }}>Welcome, Devotee 🙏</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#FFF5E4', marginTop: 4 }}>What would you like<br />to do today?</h2>
      </div>

      {/* Cards Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16, padding: '16px 20px 32px',
      }}>
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => navigate(card.route)}
            style={{
              background: card.gradient,
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 20,
              padding: '24px 16px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', textAlign: 'left',
              cursor: 'pointer',
              boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)`,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {/* Glow orb */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 80, height: 80, borderRadius: '50%',
              background: card.glow, opacity: 0.3, filter: 'blur(20px)',
            }} />
            <div style={{ fontSize: 36, marginBottom: 12 }}>{card.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, marginBottom: 6 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{card.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 24px 32px', color: 'rgba(255,200,100,0.3)', fontSize: 11 }}>
        🪔 Jai Shri Ram • Om Namah Shivaya • Jai Mata Di 🪔
      </div>
    </div>
  )
}
