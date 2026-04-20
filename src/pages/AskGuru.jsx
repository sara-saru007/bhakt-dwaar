import { useNavigate } from 'react-router-dom'

const gurus = [
  { id: 1, name: 'Swami Anandagiri', title: 'Vedantic Scholar', specialty: 'Life Guidance & Karma', emoji: '🧘', color: '#4A1A7A', gradient: 'linear-gradient(135deg, #2D0A5C, #7B2FBE)', available: true, rating: '4.9' },
  { id: 2, name: 'Pandit Rajesh Sharma', title: 'Jyotish Acharya', specialty: 'Astrology & Remedies', emoji: '⭐', color: '#1A3A7A', gradient: 'linear-gradient(135deg, #0A245C, #2F5EBE)', available: true, rating: '4.8' },
  { id: 3, name: 'Acharya Devendra Das', title: 'Vaishnavite Guru', specialty: 'Bhakti & Devotion', emoji: '🪷', color: '#7A1A1A', gradient: 'linear-gradient(135deg, #5C0A0A, #BE2F2F)', available: false, rating: '5.0' },
  { id: 4, name: 'Swami Krishnananda', title: 'Spiritual Healer', specialty: 'Healing & Peace', emoji: '🌿', color: '#1A5A2A', gradient: 'linear-gradient(135deg, #0A3C1A, #2F8A3A)', available: true, rating: '4.7' },
  { id: 5, name: 'Guru Brahmananda', title: 'Tantric Master', specialty: 'Mantra & Tantra', emoji: '🔱', color: '#5A3A00', gradient: 'linear-gradient(135deg, #3C2500, #8A5A00)', available: true, rating: '4.9' },
  { id: 6, name: 'Sant Ramkrishna Puri', title: 'Shaivite Saint', specialty: 'Shiva Sadhana', emoji: '🕉️', color: '#3A1A5A', gradient: 'linear-gradient(135deg, #25103C, #5A2A8A)', available: false, rating: '5.0' },
]

export default function AskGuru() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0A0A1A 0%, #0D0400 100%)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(100,50,200,0.08)',
        borderBottom: '1px solid rgba(150,100,255,0.15)',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(150,100,255,0.12)', border: '1px solid rgba(150,100,255,0.25)',
          borderRadius: 10, width: 38, height: 38,
          color: '#C8A0FF', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFF5E4' }}>🧘 Ask the Guru</h2>
          <p style={{ fontSize: 11, color: 'rgba(200,160,255,0.6)' }}>Seek divine guidance</p>
        </div>
      </div>

      {/* Intro */}
      <div style={{
        margin: '20px 16px',
        background: 'rgba(150,100,255,0.07)',
        border: '1px solid rgba(150,100,255,0.2)',
        borderRadius: 16, padding: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🕉️</div>
        <p style={{ fontSize: 13, color: 'rgba(255,245,228,0.75)', lineHeight: 1.6 }}>
          Our enlightened Gurus are here to guide you through life's challenges with ancient wisdom and divine blessings.
        </p>
      </div>

      {/* Gurus list */}
      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {gurus.map(guru => (
          <div
            key={guru.id}
            onClick={() => guru.available && navigate(`/guru-call/${guru.id}`, { state: guru })}
            style={{
              background: guru.gradient,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: '16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: guru.available ? 'pointer' : 'default',
              opacity: guru.available ? 1 : 0.6,
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s',
            }}
            onMouseDown={e => guru.available && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {/* Avatar */}
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, flexShrink: 0,
            }}>{guru.emoji}</div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{guru.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{guru.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>✦ {guru.specialty}</div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FFD700', marginBottom: 4 }}>⭐ {guru.rating}</div>
              <div style={{
                fontSize: 10, fontWeight: 700,
                background: guru.available ? 'rgba(50,220,100,0.2)' : 'rgba(200,200,200,0.15)',
                color: guru.available ? '#50DD70' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${guru.available ? 'rgba(50,220,100,0.4)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 8, padding: '3px 8px',
              }}>
                {guru.available ? '● Available' : '○ Busy'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
