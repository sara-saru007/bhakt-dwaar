import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import SplashScreen from './pages/SplashScreen'
import LivePuja from './pages/LivePuja'
import TempleStream from './pages/TempleStream'

// ── Devotional notification messages (used in hourly reminders)
const NOTIF_MESSAGES = [
  { title: '🕉️ भक्ति — दर्शन का समय', body: 'मंदिर के लाइव दर्शन करें और मन को शांति पाएं। 🙏' },
  { title: '🔱 हर हर महादेव', body: 'महाकालेश्वर मंदिर में लाइव अभिषेक शुरू है।' },
  { title: '🙏 जय श्री राम', body: 'प्रभु के चरणों में एक पल का दर्शन करें।' },
  { title: '✨ जय साईं राम', body: 'शिरडी साईं बाबा मंदिर में लाइव दर्शन चल रहे हैं।' },
  { title: '🐘 गणपति बाप्पा मोरया', body: 'सिद्धिविनायक मंदिर में आज के दर्शन लाइव हैं।' },
  { title: '🪷 राधे राधे', body: 'भक्ति ऐप पर मंदिर लाइव दर्शन अभी उपलब्ध हैं।' },
  { title: '🕉️ ॐ नमः शिवाय', body: 'काशी विश्वनाथ में लाइव पूजा देखें — अभी खोलें।' },
  { title: '🌸 जय माता दी', body: 'आज का पावन दिन — मंदिर दर्शन से करें।' },
  { title: '🪔 दीप जले भक्ति में', body: 'सोमनाथ मंदिर में संध्या आरती लाइव है।' },
  { title: '🙏 भगवान का आशीर्वाद', body: 'एक मिनट का दर्शन — मन होगा प्रसन्न।' },
  { title: '🔱 बम बम भोले', body: 'महाकाल का लाइव दर्शन अभी देखें।' },
  { title: '🪷 भक्ति की धारा', body: 'वडताल स्वामीनारायण मंदिर में लाइव दर्शन।' },
  { title: '🕉️ प्रभु का ध्यान', body: 'रोज़ के मंदिर दर्शन — भक्ति ऐप पर अभी खोलें।' },
]

// ── Schedule devotional local notifications: hourly from 6 AM to 6 PM, for 7 days.
// Only shows when the app is in background/closed (system behavior for local notifications).
async function scheduleDevotionalNotifications() {
  try {
    const isNative = window.Capacitor?.isNativePlatform?.() || false
    if (!isNative) return

    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // Request permission (Android 13+ requires runtime request)
    const { display } = await LocalNotifications.requestPermissions()
    if (display !== 'granted') return

    // Create a notification channel (Android 8+)
    try {
      await LocalNotifications.createChannel({
        id: 'bhakti-darshan',
        name: 'भक्ति दर्शन',
        description: 'Daily temple darshan reminders',
        importance: 3,       // IMPORTANCE_DEFAULT
        visibility: 1,       // VISIBILITY_PUBLIC
        sound: 'default',
        vibration: true,
      })
    } catch (_) { /* channel already exists or not supported */ }

    // Cancel all pending notifications before rescheduling
    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
      }
    } catch (_) {}

    const notifications = []
    const now = new Date()
    let msgIndex = 0

    // Schedule hourly from 6 AM (06:00) to 6 PM (18:00), for the next 7 days
    for (let day = 0; day < 7; day++) {
      for (let hour = 6; hour <= 18; hour++) {
        const at = new Date(now)
        at.setDate(now.getDate() + day)
        at.setHours(hour, 0, 0, 0)
        if (at <= now) continue // skip past times

        const msg = NOTIF_MESSAGES[msgIndex % NOTIF_MESSAGES.length]
        msgIndex++

        notifications.push({
          id: day * 100 + hour,       // unique ID per slot
          title: msg.title,
          body: msg.body,
          schedule: { at },
          sound: 'default',
          channelId: 'bhakti-darshan',
          smallIcon: 'ic_stat_bhakti', // white-on-transparent Om icon
          iconColor: '#FF6600',        // saffron tint for the icon
        })
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }

  } catch (e) {
    console.warn('scheduleDevotionalNotifications:', e)
  }
}

// ── Handles Android hardware back button — navigate back or exit on home screen
function BackButtonHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    const isNative = window.Capacitor?.isNativePlatform?.() || false
    if (!isNative) return

    let handle
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        // Stream page → go to home; home page → do nothing (swallow back)
        if (locationRef.current.pathname !== '/') {
          navigate('/')
        }
      }).then(h => { handle = h })
    })

    return () => { handle?.remove() }
  }, [navigate])

  return null
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  // Schedule notifications once after splash screen completes
  useEffect(() => {
    if (splashDone) {
      scheduleDevotionalNotifications()
    }
  }, [splashDone])

  return (
    <BrowserRouter>
      <BackButtonHandler />
      <div className="app-shell">
        {!splashDone ? (
          <SplashScreen onDone={() => setSplashDone(true)} />
        ) : (
          <Routes>
            <Route path="/" element={<LivePuja />} />
            <Route path="/temple-stream/:templeId" element={<TempleStream />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  )
}
