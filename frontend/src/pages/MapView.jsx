import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { ArrowLeft, Loader2, Train, MapPin, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TrackPopup from '../components/TrackPopup'
import L from 'leaflet'

// Fix default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerRetina,
  shadowUrl: markerShadow,
})

// Custom amber marker
const amberIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 22px; height: 22px;
    background: #e5a00d;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(229,160,13,0.6), 0 2px 8px rgba(0,0,0,0.4);
    cursor: grab;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// Click on map to move marker
function ClickToMove({ onMove }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Fly map to location
function FlyTo({ lat, lng, zoom }) {
  const map = useMap()
  const prevRef = useRef(null)
  useEffect(() => {
    const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`
    if (prevRef.current !== key) {
      prevRef.current = key
      // Don't fly on initial render — only on subsequent moves
    }
  }, [lat, lng, map, zoom])
  return null
}

function MapView() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Default: Düsseldorf
  const initLat = parseFloat(searchParams.get('lat')) || 51.2271
  const initLng = parseFloat(searchParams.get('lng')) || 6.7735

  const [pos, setPos] = useState({ lat: initLat, lng: initLng })
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [legendOpen, setLegendOpen] = useState(true)

  // Debounce timer
  const timerRef = useRef(null)
  const fetchIdRef = useRef(0)

  // Fetch tracks around a position
  const fetchTracks = useCallback(async (lat, lng) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    try {
      const res = await fetch(`/api/tracks?lat=${lat}&lng=${lng}&radius=2000`)
      if (res.ok && id === fetchIdRef.current) {
        setTracks(await res.json())
      }
    } catch (err) {
      console.error('Track fetch error:', err)
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Debounced move handler
  const moveMarker = useCallback((lat, lng) => {
    setPos({ lat, lng })
    window.history.replaceState({}, '', `/map?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchTracks(lat, lng), 500)
  }, [fetchTracks])

  // Initial load
  useEffect(() => {
    fetchTracks(initLat, initLng)
  }, [])

  // On marker drag end
  const onDragEnd = useCallback((e) => {
    const { lat, lng } = e.target.getLatLng()
    moveMarker(lat, lng)
  }, [moveMarker])

  // Distance helper
  const distanceTo = (track) => {
    const coords = track.geojson_geometry?.coordinates
    if (!coords?.length) return null
    let min = Infinity
    for (const [lon, lat] of coords) {
      const R = 6371000
      const dLat = (lat - pos.lat) * Math.PI / 180
      const dLng = (lon - pos.lng) * Math.PI / 180
      const a = Math.sin(dLat/2)**2 + Math.cos(pos.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      if (d < min) min = d
    }
    return min
  }

  const trackColor = (t) => t === 'freight' ? '#ef4444' : t === 'branch' ? '#71717a' : '#3b82f6'
  const trackWeight = (t) => t === 'main' ? 5 : t === 'freight' ? 4 : 3

  return (
    <div className="map-page">
      {/* Header */}
      <motion.div
        className="map-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}
          >
            <ArrowLeft size={16} />
            Zurück
          </button>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--amber)' }}>SIGNAL</span> Karte
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading && <Loader2 className="animate-spin" size={14} style={{ color: 'var(--amber)' }} />}
            <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'var(--font-mono)' }}>
              {tracks.length} Gleise
            </span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#555', marginTop: '4px' }}>
          Marker ziehen oder auf Karte tippen
        </p>
      </motion.div>

      {/* Map */}
      <div className="map-container">
        <MapContainer
          center={[initLat, initLng]}
          zoom={14}
          style={{ height: '100vh', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OSM &amp; CARTO"
          />

          <ClickToMove onMove={moveMarker} />
          <FlyTo lat={pos.lat} lng={pos.lng} zoom={14} />

          {/* Draggable amber marker */}
          <Marker
            position={[pos.lat, pos.lng]}
            icon={amberIcon}
            draggable={true}
            eventHandlers={{ dragend: onDragEnd }}
          />

          {/* Track polylines */}
          {tracks.map((track) => {
            const coords = track.geojson_geometry?.coordinates
            if (!coords?.length) return null
            const positions = coords.map(([lon, lat]) => [lat, lon])
            const color = trackColor(track.track_type)
            const weight = trackWeight(track.track_type)

            return (
              <React.Fragment key={track.id}>
                {/* Glow */}
                <Polyline positions={positions} color={color} weight={weight + 6} opacity={0.12} />
                {/* Line */}
                <Polyline
                  positions={positions}
                  color={color}
                  weight={weight}
                  opacity={0.85}
                  eventHandlers={{
                    click: () => setSelectedTrack({ ...track, distance: distanceTo(track) })
                  }}
                />
              </React.Fragment>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <AnimatePresence>
        {legendOpen && (
          <motion.div
            className="map-legend"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.75rem' }}>
                <Train size={13} style={{ color: 'var(--amber)' }} />
                Gleistypen
              </span>
              <button onClick={() => setLegendOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}>×</button>
            </div>
            {[
              ['#3b82f6', 'Hauptstrecke', 3],
              ['#71717a', 'Nebenstrecke', 2],
              ['#ef4444', 'Güterstrecke', 3],
            ].map(([c, label, h]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', marginTop: '3px' }}>
                <div style={{ width: '16px', height: `${h}px`, background: c, borderRadius: '2px' }} />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!legendOpen && (
        <motion.button
          onClick={() => setLegendOpen(true)}
          style={{ position: 'fixed', bottom: 20, left: 12, zIndex: 1000, width: 36, height: 36, borderRadius: '50%', background: 'rgba(9,9,11,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--amber)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Train size={15} />
        </motion.button>
      )}

      {/* Track detail popup */}
      <AnimatePresence>
        {selectedTrack && (
          <TrackPopup
            track={selectedTrack}
            userLocation={pos}
            onClose={() => setSelectedTrack(null)}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay — only on first load */}
      <AnimatePresence>
        {loading && tracks.length === 0 && (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(17,17,20,0.95)', padding: '0.75rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Loader2 className="animate-spin" size={18} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: '0.85rem' }}>Lade Bahndaten…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MapView
