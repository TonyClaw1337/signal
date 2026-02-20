import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet'
import { ArrowLeft, Loader2, Train, MapPin, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TrackPopup from '../components/TrackPopup'
import L from 'leaflet'

// Fix leaflet icons
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerRetina, shadowUrl: markerShadow })

// Amber draggable marker
const amberIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 24px; height: 24px;
    background: #e5a00d;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 16px rgba(229,160,13,0.5), 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Click handler
function ClickHandler({ onMove }) {
  useMapEvents({ click(e) { onMove(e.latlng.lat, e.latlng.lng) } })
  return null
}

export default function MapView() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initLat = parseFloat(searchParams.get('lat')) || 51.2271
  const initLng = parseFloat(searchParams.get('lng')) || 6.7735

  const [pos, setPos] = useState({ lat: initLat, lng: initLng })
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [legendOpen, setLegendOpen] = useState(true)

  const timerRef = useRef(null)
  const fetchIdRef = useRef(0)

  const fetchTracks = useCallback(async (lat, lng) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tracks?lat=${lat}&lng=${lng}&radius=2000`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (id !== fetchIdRef.current) return
      const data = await res.json()
      setTracks(data)
      if (data.length === 0) setError('Keine Gleise in diesem Bereich gefunden')
    } catch (err) {
      if (id === fetchIdRef.current) {
        setError('Fehler beim Laden der Gleisdaten')
        console.error(err)
      }
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  const moveMarker = useCallback((lat, lng) => {
    setPos({ lat, lng })
    window.history.replaceState({}, '', `/map?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchTracks(lat, lng), 600)
  }, [fetchTracks])

  useEffect(() => { fetchTracks(initLat, initLng) }, [])

  const onDragEnd = useCallback((e) => {
    const { lat, lng } = e.target.getLatLng()
    moveMarker(lat, lng)
  }, [moveMarker])

  // Distance calculation
  const distanceTo = (track) => {
    const coords = track.geojson_geometry?.coordinates
    if (!coords?.length) return null
    let min = Infinity
    for (const [lon, lat] of coords) {
      const R = 6371000
      const dLat = (lat - pos.lat) * Math.PI / 180
      const dLng = (lon - pos.lng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(pos.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (d < min) min = d
    }
    return min
  }

  const color = (t) => t === 'freight' ? '#ef4444' : t === 'branch' ? '#a1a1aa' : '#3b82f6'
  const weight = (t) => t === 'main' ? 5 : t === 'freight' ? 4 : 3

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {/* Header bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 12px', color: '#ccc',
              cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
            }}
          >
            <ArrowLeft size={15} /> Zurück
          </button>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            <span style={{ color: 'var(--amber)' }}>SIGNAL</span>
            <span style={{ color: '#888', fontWeight: 400 }}> Karte</span>
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'flex-end' }}>
            {loading && <Loader2 className="animate-spin" size={14} style={{ color: 'var(--amber)' }} />}
            <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'var(--font-mono)' }}>
              {tracks.length} Gleise
            </span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#555', marginTop: 4, lineHeight: 1 }}>
          Marker ziehen oder auf Karte tippen · Gleis antippen für Details
        </p>
      </div>

      {/* Map */}
      <MapContainer
        center={[initLat, initLng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM &amp; CARTO"
        />
        <ClickHandler onMove={moveMarker} />

        {/* Draggable marker */}
        <Marker
          position={[pos.lat, pos.lng]}
          icon={amberIcon}
          draggable={true}
          eventHandlers={{ dragend: onDragEnd }}
        />

        {/* Track lines */}
        {tracks.map((track) => {
          const coords = track.geojson_geometry?.coordinates
          if (!coords?.length) return null
          const positions = coords.map(([lon, lat]) => [lat, lon])
          const c = color(track.track_type)
          const w = weight(track.track_type)
          return (
            <React.Fragment key={track.id}>
              <Polyline positions={positions} color={c} weight={w + 6} opacity={0.12} />
              <Polyline
                positions={positions} color={c} weight={w} opacity={0.85}
                eventHandlers={{ click: () => setSelectedTrack({ ...track, distance: distanceTo(track) }) }}
              />
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Error banner */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'rgba(17,17,20,0.95)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
              maxWidth: '90vw',
            }}
          >
            <Info size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <AnimatePresence>
        {legendOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{
              position: 'fixed', bottom: 20, left: 12, zIndex: 1000,
              background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)',
              borderRadius: 10, padding: '8px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '0.72rem' }}>
                <Train size={12} style={{ color: 'var(--amber)' }} /> Gleistypen
              </span>
              <button onClick={() => setLegendOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', padding: '0 4px' }}>×</button>
            </div>
            {[['#3b82f6', 'Hauptstrecke', 3], ['#a1a1aa', 'Nebenstrecke', 2], ['#ef4444', 'Güterstrecke', 3]].map(([c, l, h]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', marginTop: 2, color: '#bbb' }}>
                <div style={{ width: 14, height: h, background: c, borderRadius: 1 }} />
                {l}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!legendOpen && (
        <button
          onClick={() => setLegendOpen(true)}
          style={{
            position: 'fixed', bottom: 20, left: 12, zIndex: 1000,
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(9,9,11,0.92)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--amber)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Train size={14} />
        </button>
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

      {/* Initial loading overlay */}
      <AnimatePresence>
        {loading && tracks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(17,17,20,0.95)', padding: '12px 24px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Loader2 className="animate-spin" size={18} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: '0.85rem' }}>Lade Bahndaten…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
