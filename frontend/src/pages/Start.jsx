import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Search } from 'lucide-react'
import { motion } from 'framer-motion'

const Start = () => {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    if (!address.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() })
      })

      if (response.ok) {
        const location = await response.json()
        navigate(`/map?lat=${location.lat}&lng=${location.lng}`)
      } else {
        alert('Adresse nicht gefunden. Bitte versuchen Sie es erneut.')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Fehler beim Geocodieren der Adresse.')
    } finally {
      setLoading(false)
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert('GPS wird von diesem Browser nicht unterstützt.')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        navigate(`/map?lat=${latitude}&lng=${longitude}`)
      },
      (error) => {
        console.error('GPS error:', error)
        alert('GPS-Standort konnte nicht ermittelt werden.')
        setLoading(false)
      }
    )
  }

  const handleMapPicker = () => {
    // Default to Berlin center for map picker
    navigate('/map?lat=52.520008&lng=13.404954&picker=true')
  }

  return (
    <div className="start-page">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="start-content"
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="heading-xl"
            style={{ color: '#ffffff', marginBottom: '1rem' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span style={{ color: 'var(--amber)' }}>SIGNAL</span>
          </motion.h1>
          <motion.p 
            className="text-lg"
            style={{ color: '#d1d5db' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Zug-Frequenz & Lärm-Analyse
          </motion.p>
          <motion.p 
            className="text-sm mt-2"
            style={{ color: '#9ca3af' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Finden Sie Bahnstrecken in Ihrer Nähe und analysieren Sie Zugfrequenzen und Lärmbelastung
          </motion.p>
        </div>

        <div className="space-y-4">
          {/* Address Input */}
          <motion.form 
            onSubmit={handleAddressSubmit}
            className="card-glass"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Search size={20} style={{ color: 'var(--amber)' }} />
              <h3 className="heading-md">Adresse eingeben</h3>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="z.B. Hauptbahnhof München"
                className="input"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={loading || !address.trim()}
              >
                {loading ? 'Suche...' : 'Suchen'}
              </button>
            </div>
          </motion.form>

          {/* GPS Location */}
          <motion.button
            onClick={handleGPS}
            className="card-glass w-full"
            style={{ 
              textAlign: 'left', 
              border: 'none', 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: 'var(--bg-glass)'
            }}
            disabled={loading}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(40, 40, 40, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--bg-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Navigation size={20} style={{ color: 'var(--amber)' }} />
              <div>
                <h3 className="heading-md">Meinen Standort verwenden</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>GPS-Position nutzen</p>
              </div>
            </div>
          </motion.button>

          {/* Map Picker */}
          <motion.button
            onClick={handleMapPicker}
            className="card-glass w-full"
            style={{ 
              textAlign: 'left', 
              border: 'none', 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: 'var(--bg-glass)'
            }}
            disabled={loading}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(40, 40, 40, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--bg-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={20} style={{ color: 'var(--amber)' }} />
              <div>
                <h3 className="heading-md">Auf Karte wählen</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Position manuell auswählen</p>
              </div>
            </div>
          </motion.button>
        </div>

        <motion.footer 
          className="text-center text-xs mt-8"
          style={{ color: '#6b7280' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Powered by OpenStreetMap & Tony Claw Platform
        </motion.footer>
      </motion.div>
    </div>
  )
}

export default Start