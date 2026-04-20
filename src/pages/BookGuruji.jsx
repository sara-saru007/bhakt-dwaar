import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Varanasi',
  'Lucknow', 'Indore', 'Chandigarh', 'Coimbatore', 'Others',
]

const POOJAS = [
  { id: 'griha', name: 'Griha Pravesh', desc: 'Home warming ceremony', duration: '2-3 hours', icon: '🏠' },
  { id: 'ganesh', name: 'Ganesh Homa', desc: 'Obstacle removal ritual', duration: '1-2 hours', icon: '🐘' },
  { id: 'satyanarayan', name: 'Satyanarayan Puja', desc: 'Prosperity & blessings', duration: '2 hours', icon: '🌺' },
  { id: 'navgraha', name: 'Navgraha Homa', desc: 'Planetary harmony ritual', duration: '3-4 hours', icon: '🪐' },
  { id: 'rudrabhishek', name: 'Rudrabhishek', desc: 'Lord Shiva worship', duration: '2-3 hours', icon: '🔱' },
  { id: 'kali', name: 'Kali Puja', desc: 'Divine mother worship', duration: '3 hours', icon: '🌙' },
  { id: 'lakshmi', name: 'Lakshmi Puja', desc: 'Wealth & prosperity', duration: '1-2 hours', icon: '💛' },
  { id: 'vastu', name: 'Vastu Shanti', desc: 'Harmony of space ritual', duration: '4-5 hours', icon: '🧿' },
]

const GURUJIS = [
  { id: 1, name: 'Pandit Shiv Prasad Tiwari', exp: '22 years', rating: 4.9, reviews: 312, fees: 2100, specialties: ['Griha Pravesh', 'Satyanarayan', 'Navgraha'], avatar: '🕉️', verified: true },
  { id: 2, name: 'Acharya Ramesh Joshi', exp: '15 years', rating: 4.8, reviews: 198, fees: 1500, specialties: ['Ganesh Homa', 'Lakshmi Puja', 'Vastu'], avatar: '🙏', verified: true },
  { id: 3, name: 'Pandit Venkatesh Iyer', exp: '30 years', rating: 5.0, reviews: 501, fees: 3500, specialties: ['All rituals'], avatar: '🔱', verified: true },
  { id: 4, name: 'Acharya Suresh Pathak', exp: '10 years', rating: 4.7, reviews: 145, fees: 1100, specialties: ['Kali Puja', 'Rudrabhishek'], avatar: '🌺', verified: false },
  { id: 5, name: 'Pandit Deepak Bhattacharya', exp: '18 years', rating: 4.8, reviews: 267, fees: 1800, specialties: ['Griha Pravesh', 'Vastu Shanti'], avatar: '✨', verified: true },
]

// Calendar helpers
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function getFirstDay(year, month) { return new Date(year, month, 1).getDay() }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function MiniCalendar({ selectedDate, onSelect }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isPast = (d) => {
    const date = new Date(viewYear, viewMonth, d)
    date.setHours(0,0,0,0)
    const t = new Date(); t.setHours(0,0,0,0)
    return date < t
  }
  const isSelected = (d) => selectedDate && selectedDate.year === viewYear && selectedDate.month === viewMonth && selectedDate.day === d
  const isToday = (d) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 16, padding: '16px', marginTop: 16 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#FFB347', fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#FFD700' }}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#FFB347', fontSize: 18, cursor: 'pointer' }}>›</button>
      </div>
      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,200,100,0.5)', fontWeight: 600 }}>{d}</div>)}
      </div>
      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((d, i) => (
          <button
            key={i}
            disabled={!d || isPast(d)}
            onClick={() => d && !isPast(d) && onSelect({ year: viewYear, month: viewMonth, day: d })}
            style={{
              height: 34, borderRadius: 8, border: 'none',
              background: isSelected(d) ? 'linear-gradient(135deg, #FF8C00, #CC4400)' : isToday(d) ? 'rgba(255,140,0,0.2)' : 'transparent',
              color: !d ? 'transparent' : isPast(d) ? 'rgba(255,255,255,0.15)' : isSelected(d) ? '#fff' : isToday(d) ? '#FFD700' : '#FFF5E4',
              fontSize: 13, fontWeight: isSelected(d) ? 700 : 400,
              cursor: (!d || isPast(d)) ? 'default' : 'pointer',
              boxShadow: isSelected(d) ? '0 2px 8px rgba(255,140,0,0.4)' : 'none',
            }}
          >{d || ''}</button>
        ))}
      </div>
    </div>
  )
}

// Time slots
const TIME_SLOTS = ['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','4:00 PM','5:00 PM','6:00 PM','7:00 PM']
const UNAVAILABLE = [1, 3, 7] // indices that are "booked"

export default function BookGuruji() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: city+pooja, 2: guruji list, 3: booking, 4: confirm
  const [city, setCity] = useState('')
  const [pooja, setPooja] = useState(null)
  const [selectedGuruji, setSelectedGuruji] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [booked, setBooked] = useState(false)

  const canProceedStep1 = city && pooja

  const handleBooking = () => {
    setBooked(true)
    setStep(4)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A0800 0%, #0D0400 100%)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,140,0,0.06)',
        borderBottom: '1px solid rgba(255,140,0,0.15)',
        position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(8px)',
      }}>
        <button onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)} style={{
          background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.25)',
          borderRadius: 10, width: 38, height: 38,
          color: '#FFB347', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFF5E4' }}>📅 Book a Guruji</h2>
          <p style={{ fontSize: 11, color: 'rgba(255,220,150,0.6)' }}>Step {Math.min(step, 3)} of 3</p>
        </div>
        {/* Step indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              width: s <= step ? 20 : 8, height: 8, borderRadius: 4,
              background: s <= step ? '#FF8C00' : 'rgba(255,140,0,0.2)',
              transition: 'width 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* STEP 1 — City & Pooja */}
      {step === 1 && (
        <div style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFD700', marginBottom: 4 }}>Select City & Pooja</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,220,150,0.5)', marginBottom: 20 }}>We'll find available Gurujis near you</p>

          {/* City */}
          <label style={{ fontSize: 12, color: 'rgba(255,220,150,0.7)', fontWeight: 600, marginBottom: 6, display: 'block' }}>🏙️ Your City</label>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.25)',
              borderRadius: 14, color: city ? '#FFF5E4' : 'rgba(255,245,228,0.4)',
              fontSize: 14, marginBottom: 20, appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23FF8C00' stroke-width='2' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
            }}
          >
            <option value="" style={{ background: '#1A0800' }}>— Select your city —</option>
            {CITIES.map(c => <option key={c} value={c} style={{ background: '#1A0800' }}>{c}</option>)}
          </select>

          {/* Pooja */}
          <label style={{ fontSize: 12, color: 'rgba(255,220,150,0.7)', fontWeight: 600, marginBottom: 10, display: 'block' }}>🪔 Type of Pooja</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {POOJAS.map(p => (
              <button
                key={p.id}
                onClick={() => setPooja(p)}
                style={{
                  background: pooja?.id === p.id ? 'rgba(255,140,0,0.18)' : 'rgba(255,140,0,0.06)',
                  border: `1px solid ${pooja?.id === p.id ? 'rgba(255,140,0,0.6)' : 'rgba(255,140,0,0.18)'}`,
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: pooja?.id === p.id ? 'rgba(255,140,0,0.25)' : 'rgba(255,140,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                }}>{p.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: pooja?.id === p.id ? '#FFD700' : '#FFF5E4' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,220,150,0.5)', marginTop: 2 }}>{p.desc} • {p.duration}</div>
                </div>
                {pooja?.id === p.id && <span style={{ color: '#FFD700', fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>

          <button
            disabled={!canProceedStep1}
            onClick={() => setStep(2)}
            style={{
              width: '100%', marginTop: 24, height: 54, borderRadius: 16,
              background: canProceedStep1 ? 'linear-gradient(135deg, #FF8C00, #CC4400)' : 'rgba(255,140,0,0.1)',
              border: 'none', color: canProceedStep1 ? '#fff' : 'rgba(255,200,100,0.3)',
              fontSize: 15, fontWeight: 700,
              boxShadow: canProceedStep1 ? '0 4px 16px rgba(255,140,0,0.3)' : 'none',
              transition: 'all 0.2s',
              marginBottom: 32,
            }}
          >Find Gurujis →</button>
        </div>
      )}

      {/* STEP 2 — Guruji List */}
      {step === 2 && (
        <div style={{ padding: '20px 16px' }}>
          <div style={{
            background: 'rgba(255,140,0,0.07)', border: '1px solid rgba(255,140,0,0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>{pooja?.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#FFD700' }}>{pooja?.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,220,150,0.5)' }}>{city} • {pooja?.duration}</div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFF5E4', marginBottom: 4 }}>Available Gurujis</h3>
          <p style={{ fontSize: 11, color: 'rgba(255,220,150,0.5)', marginBottom: 16 }}>{GURUJIS.length} Gurujis found in {city}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
            {GURUJIS.map(g => (
              <button
                key={g.id}
                onClick={() => { setSelectedGuruji(g); setStep(3) }}
                style={{
                  background: 'rgba(255,140,0,0.07)', border: '1px solid rgba(255,140,0,0.2)',
                  borderRadius: 18, padding: '16px',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'linear-gradient(135deg, #8B1A00, #D44000)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0,
                  }}>{g.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#FFF5E4' }}>{g.name}</span>
                      {g.verified && <span style={{ fontSize: 10, background: 'rgba(50,200,100,0.15)', color: '#50C878', border: '1px solid rgba(50,200,100,0.3)', borderRadius: 6, padding: '1px 5px' }}>✓ Verified</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,220,150,0.6)', marginTop: 3 }}>{g.exp} experience</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#FFD700', fontWeight: 700 }}>⭐ {g.rating}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,220,150,0.5)' }}>({g.reviews} reviews)</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#FFD700' }}>₹{g.fees.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,220,150,0.5)' }}>per puja</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {g.specialties.map((s, i) => (
                    <span key={i} style={{
                      background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.25)',
                      borderRadius: 8, padding: '3px 8px', fontSize: 10, color: 'rgba(255,200,100,0.8)',
                    }}>{s}</span>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,140,0,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,220,150,0.7)' }}>Book this Guruji</span>
                  <span style={{ color: '#FF8C00' }}>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — Booking calendar */}
      {step === 3 && (
        <div style={{ padding: '20px 16px' }}>
          {/* Selected guruji */}
          <div style={{
            background: 'rgba(255,140,0,0.07)', border: '1px solid rgba(255,140,0,0.2)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{selectedGuruji?.avatar}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF5E4' }}>{selectedGuruji?.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,220,150,0.5)' }}>{pooja?.name} • ₹{selectedGuruji?.fees.toLocaleString()}</div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFF5E4', marginBottom: 4 }}>📅 Select Date</h3>
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

          {selectedDate && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFF5E4', margin: '20px 0 12px' }}>⏰ Select Time Slot</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {TIME_SLOTS.map((slot, i) => {
                  const unavail = UNAVAILABLE.includes(i)
                  const sel = selectedTime === slot
                  return (
                    <button
                      key={i}
                      disabled={unavail}
                      onClick={() => setSelectedTime(slot)}
                      style={{
                        padding: '12px 8px', borderRadius: 12,
                        background: sel ? 'linear-gradient(135deg, #FF8C00, #CC4400)' : unavail ? 'rgba(255,255,255,0.03)' : 'rgba(255,140,0,0.08)',
                        border: `1px solid ${sel ? 'rgba(255,140,0,0.8)' : unavail ? 'rgba(255,255,255,0.08)' : 'rgba(255,140,0,0.2)'}`,
                        color: sel ? '#fff' : unavail ? 'rgba(255,255,255,0.2)' : '#FFF5E4',
                        fontSize: 13, fontWeight: sel ? 700 : 400,
                        cursor: unavail ? 'not-allowed' : 'pointer',
                        position: 'relative',
                      }}
                    >
                      {slot}
                      {unavail && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(255,100,100,0.6)', borderRadius: 12 }}>Booked</div>}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            disabled={!selectedDate || !selectedTime}
            onClick={handleBooking}
            style={{
              width: '100%', marginTop: 24, height: 54, borderRadius: 16,
              background: (selectedDate && selectedTime) ? 'linear-gradient(135deg, #FF8C00, #CC4400)' : 'rgba(255,140,0,0.1)',
              border: 'none', color: (selectedDate && selectedTime) ? '#fff' : 'rgba(255,200,100,0.3)',
              fontSize: 15, fontWeight: 700,
              boxShadow: (selectedDate && selectedTime) ? '0 4px 16px rgba(255,140,0,0.3)' : 'none',
              marginBottom: 32,
            }}
          >Confirm Booking →</button>
        </div>
      )}

      {/* STEP 4 — Confirmation */}
      {step === 4 && (
        <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 16, animation: 'popIn 0.5s ease' }}>🙏</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#FFD700', marginBottom: 8 }}>Booking Confirmed!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,245,228,0.7)', lineHeight: 1.7, marginBottom: 32 }}>
            May Lord bless this auspicious occasion.<br />Your booking details are below.
          </p>

          <div style={{
            width: '100%', background: 'rgba(255,140,0,0.07)',
            border: '1px solid rgba(255,140,0,0.25)',
            borderRadius: 18, padding: '20px', marginBottom: 28,
            textAlign: 'left',
          }}>
            {[
              { label: 'Guruji', value: selectedGuruji?.name },
              { label: 'Pooja', value: pooja?.name },
              { label: 'City', value: city },
              { label: 'Date', value: selectedDate ? `${selectedDate.day} ${MONTHS[selectedDate.month]} ${selectedDate.year}` : '' },
              { label: 'Time', value: selectedTime },
              { label: 'Fees', value: `₹${selectedGuruji?.fees.toLocaleString()}` },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < 5 ? '1px solid rgba(255,140,0,0.1)' : 'none',
              }}>
                <span style={{ fontSize: 12, color: 'rgba(255,220,150,0.5)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: '#FFF5E4', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(50,200,100,0.08)', border: '1px solid rgba(50,200,100,0.25)',
            borderRadius: 12, padding: '12px 20px', marginBottom: 28,
            fontSize: 12, color: 'rgba(150,255,180,0.8)', lineHeight: 1.6,
          }}>
            📞 The Guruji's team will contact you<br />within 2 hours to confirm your booking.
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', height: 54, borderRadius: 16,
              background: 'linear-gradient(135deg, #FF8C00, #CC4400)',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 16px rgba(255,140,0,0.3)',
            }}
          >🏠 Back to Home</button>
        </div>
      )}

      <style>{`
        select option { background: #1A0800; color: #FFF5E4; }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}
