import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Search, Train, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const Start = () => {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const goToMap = (lat, lng) => {
    navigate(`/map?lat=${lat}&lng=${lng}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!address.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() })
      })
      if (res.ok) {
        const loc = await res.json()
        goToMap(loc.lat, loc.lng)
      } else {
        setError('Adresse nicht gefunden')
      }
    } catch {
      setError('Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError('GPS nicht unterstützt')
      return
    }
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => goToMap(pos.coords.latitude, pos.coords.longitude),
      () => { setError('GPS-Zugriff verweigert'); setLoading(false) },
      { timeout: 10000 }
    )
  }

  // Quick-access cities
  const presets = [
    { name: 'Düsseldorf', lat: 51.2271, lng: 6.7735 },
    { name: 'Köln', lat: 50.9375, lng: 6.9603 },
    { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { name: 'München', lat: 48.1351, lng: 11.5820 },
  ]

  return (
    <div className="start-page">
      <motion.div
        className="start-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Train size={48} style={{ color: 'var(--amber)', marginBottom: '0.75rem' }} />
          </motion.div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--amber)' }}>SIGNAL</span>
          </h1>
          <p style={{ color: '#999', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Zugfrequenz & Lärmanalyse
          </p>
        </div>

        {/* Search */}
        <motion.form
          onSubmit={handleSubmit}
          className="card-glass"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse eingeben..."
                className="input"
                style={{ paddingLeft: '2.25rem' }}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !address.trim()}>
              <ArrowRight size={18} />
            </button>
          </div>
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
          )}
        </motion.form>

        {/* GPS */}
        <motion.button
          onClick={handleGPS}
          disabled={loading}
          className="card-glass"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
            cursor: 'pointer', border: '1px solid var(--border)', marginTop: '0.75rem',
            textAlign: 'left', padding: '1rem 1.25rem',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.98 }}
        >
          <Navigation size={20} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Meinen Standort verwenden</div>
            <div style={{ color: '#777', fontSize: '0.75rem' }}>GPS-Position</div>
          </div>
        </motion.button>

        {/* Presets */}
        <motion.div
          style={{ marginTop: '1.5rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p style={{ color: '#555', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Schnellzugriff
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {presets.map((city) => (
              <button
                key={city.name}
                onClick={() => goToMap(city.lat, city.lng)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '0.6rem 0.75rem', cursor: 'pointer',
                  color: '#ccc', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--amber)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <MapPin size={14} style={{ color: 'var(--amber)' }} />
                {city.name}
              </button>
            ))}
          </div>
        </motion.div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.65rem', marginTop: '2rem' }}>
          Tony Claw Platform · OpenStreetMap
        </p>
      </motion.div>
    </div>
  )
}

export default Start
