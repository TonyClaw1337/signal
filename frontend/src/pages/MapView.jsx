import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet'
import { ArrowLeft, Loader2, Train, MapPin, Info, Volume2, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TrackPopup from '../components/TrackPopup'
import L from 'leaflet'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerRetina, shadowUrl: markerShadow })

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

function ClickHandler({ onMove }) {
  useMapEvents({ click(e) { onMove(e.latlng.lat, e.latlng.lng) } })
  return null
}

// ---- Noise model ----
// Base dB at 25m by track type, plus trains/hour
const TRACK_NOISE = {
  main:    { baseDb: 82, trainsH: 18, color: '#3b82f6' },
  freight: { baseDb: 88, trainsH: 5,  color: '#ef4444' },
  branch:  { baseDb: 72, trainsH: 6,  color: '#a1a1aa' },
}

// Noise zones: dB threshold → color
const NOISE_ZONES = [
  { minDb: 70, color: 'rgba(239, 68, 68, 0.35)',  label: '> 70 dB (sehr laut)' },
  { minDb: 60, color: 'rgba(249, 115, 22, 0.22)',  label: '60–70 dB (laut)' },
  { minDb: 50, color: 'rgba(234, 179, 8, 0.14)',   label: '50–60 dB (mäßig)' },
  { minDb: 40, color: 'rgba(34, 197, 94, 0.08)',   label: '40–50 dB (leise)' },
]

// Distance where noise drops to given dB
function noiseReachM(baseDb, targetDb) {
  // Simple model: -6 dB per distance doubling from 25m reference
  const diff = baseDb - targetDb
  const doublings = diff / 6
  return 25 * Math.pow(2, doublings)
}

// Offset a point perpendicular to a bearing by `dist` meters
function offsetPoint(lat, lng, bearingRad, distM, side) {
  const R = 6371000
  const perpBearing = bearingRad + (side === 'left' ? -Math.PI / 2 : Math.PI / 2)
  const dLat = (distM / R) * Math.cos(perpBearing)
  const dLng = (distM / R) * Math.sin(perpBearing) / Math.cos(lat * Math.PI / 180)
  return [lat + dLat * (180 / Math.PI), lng + dLng * (180 / Math.PI)]
}

// Generate a buffer polygon around a polyline at given distance
function generateBuffer(coords, distM) {
  if (coords.length < 2 || distM < 1) return []
  
  const leftSide = []
  const rightSide = []
  
  for (let i = 0; i < coords.length; i++) {
    const [lon, lat] = coords[i]
    
    // Calculate bearing from prev→next (or use neighbors)
    let bearing
    if (i === 0) {
      const [nLon, nLat] = coords[1]
      bearing = Math.atan2(nLon - lon, nLat - lat)
    } else if (i === coords.length - 1) {
      const [pLon, pLat] = coords[i - 1]
      bearing = Math.atan2(lon - pLon, lat - pLat)
    } else {
      const [pLon, pLat] = coords[i - 1]
      const [nLon, nLat] = coords[i + 1]
      bearing = Math.atan2(nLon - pLon, nLat - pLat)
    }
    
    const bearingRad = bearing * Math.PI / 180 * (180 / Math.PI) // already in useful form
    // Actually compute proper bearing in radians
    let bRad
    if (i === 0) {
      const [nLon, nLat] = coords[1]
      bRad = Math.atan2((nLon - lon) * Math.cos(lat * Math.PI / 180), nLat - lat)
    } else if (i === coords.length - 1) {
      const [pLon, pLat] = coords[i - 1]
      bRad = Math.atan2((lon - pLon) * Math.cos(lat * Math.PI / 180), lat - pLat)
    } else {
      const [pLon, pLat] = coords[i - 1]
      const [nLon, nLat] = coords[i + 1]
      bRad = Math.atan2((nLon - pLon) * Math.cos(lat * Math.PI / 180), nLat - pLat)
    }
    
    leftSide.push(offsetPoint(lat, lon, bRad, distM, 'left'))
    rightSide.push(offsetPoint(lat, lon, bRad, distM, 'right'))
  }
  
  // Close the polygon: left forward, right backward
  return [...leftSide, ...rightSide.reverse()]
}

// Noise buffer component for a single track
const NoiseBuffers = React.memo(({ track }) => {
  const noise = TRACK_NOISE[track.track_type] || TRACK_NOISE.main
  const coords = track.geojson_geometry?.coordinates
  if (!coords || coords.length < 2) return null
  
  // Sample coords to reduce polygon complexity (every Nth point)
  const step = Math.max(1, Math.floor(coords.length / 40))
  const sampled = coords.filter((_, i) => i % step === 0 || i === coords.length - 1)
  
  return (
    <>
      {NOISE_ZONES.map((zone, zi) => {
        const dist = noiseReachM(noise.baseDb, zone.minDb)
        if (dist > 2000) return null // Don't draw zones beyond 2km
        const polygon = generateBuffer(sampled, dist)
        if (polygon.length < 4) return null
        return (
          <Polyline
            key={`noise-${track.id}-${zi}`}
            positions={polygon}
            color={zone.color.replace(/[\d.]+\)$/, '1)')} // solid color
            fillColor={zone.color}
            fillOpacity={1}
            weight={0}
            fill={true}
            // Use Polygon behavior via closed polyline
          />
        )
      }).reverse()  /* Draw outer zones first */}
    </>
  )
})

// We need Polygon, not Polyline for fill
import { Polygon } from 'react-leaflet'

const NoiseBufferPolygons = React.memo(({ track }) => {
  const noise = TRACK_NOISE[track.track_type] || TRACK_NOISE.main
  const coords = track.geojson_geometry?.coordinates
  if (!coords || coords.length < 2) return null
  
  const step = Math.max(1, Math.floor(coords.length / 50))
  const sampled = coords.filter((_, i) => i % step === 0 || i === coords.length - 1)
  
  // Generate zones from outer to inner
  const zones = NOISE_ZONES.map((zone) => {
    const dist = noiseReachM(noise.baseDb, zone.minDb)
    if (dist > 3000) return null
    const polygon = generateBuffer(sampled, dist)
    return { ...zone, dist, polygon }
  }).filter(Boolean).reverse() // outer first
  
  return (
    <>
      {zones.map((zone, i) => (
        zone.polygon.length >= 4 && (
          <Polygon
            key={`noise-${track.id}-${i}`}
            positions={zone.polygon}
            pathOptions={{
              color: 'transparent',
              fillColor: zone.color.replace(/,\s*[\d.]+\)/, ', 1)'),
              fillOpacity: parseFloat(zone.color.match(/[\d.]+\)$/)?.[0] || '0.1'),
              weight: 0,
              interactive: false,
            }}
          />
        )
      ))}
    </>
  )
})

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
  const [showNoise, setShowNoise] = useState(true)

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

  const trackColor = (t) => (TRACK_NOISE[t] || TRACK_NOISE.main).color
  const trackWeight = (t) => t === 'main' ? 4 : t === 'freight' ? 3 : 2

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 12px', color: '#ccc',
            cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
          }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <p style={{ fontSize: '0.65rem', color: '#555', margin: 0 }}>
            Marker ziehen · Gleis antippen für Details
          </p>
          
          {/* Noise toggle */}
          <button
            onClick={() => setShowNoise(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: showNoise ? 'rgba(229,160,13,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showNoise ? 'rgba(229,160,13,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
              color: showNoise ? 'var(--amber)' : '#666',
              fontSize: '0.65rem', fontFamily: 'var(--font-body)',
            }}
          >
            <Volume2 size={11} />
            Lärm {showNoise ? 'an' : 'aus'}
          </button>
        </div>
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

        <Marker
          position={[pos.lat, pos.lng]}
          icon={amberIcon}
          draggable={true}
          eventHandlers={{ dragend: onDragEnd }}
        />

        {/* Noise buffer zones (rendered behind tracks) */}
        {showNoise && tracks.map((track) => (
          <NoiseBufferPolygons key={`nb-${track.id}`} track={track} />
        ))}

        {/* Track lines */}
        {tracks.map((track) => {
          const coords = track.geojson_geometry?.coordinates
          if (!coords?.length) return null
          const positions = coords.map(([lon, lat]) => [lat, lon])
          const c = trackColor(track.track_type)
          const w = trackWeight(track.track_type)
          return (
            <React.Fragment key={track.id}>
              <Polyline positions={positions} color={c} weight={w + 4} opacity={0.15} />
              <Polyline
                positions={positions} color={c} weight={w} opacity={0.9}
                eventHandlers={{ click: () => setSelectedTrack({ ...track, distance: distanceTo(track) }) }}
              />
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Error */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'rgba(17,17,20,0.95)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Info size={14} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <AnimatePresence>
        {legendOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{
              position: 'fixed', bottom: 20, left: 12, zIndex: 1000,
              background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)',
              borderRadius: 10, padding: '10px 14px',
              border: '1px solid rgba(255,255,255,0.06)',
              minWidth: 160,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '0.72rem' }}>
                <Train size={12} style={{ color: 'var(--amber)' }} /> Legende
              </span>
              <button onClick={() => setLegendOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', padding: '0 4px' }}>×</button>
            </div>
            
            {/* Track types */}
            <div style={{ fontSize: '0.6rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Gleistypen</div>
            {[
              ['#3b82f6', 'Hauptstrecke', 3],
              ['#a1a1aa', 'Nebenstrecke', 2],
              ['#ef4444', 'Güterstrecke', 3],
            ].map(([c, label, h]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', marginTop: 2, color: '#bbb' }}>
                <div style={{ width: 14, height: h, background: c, borderRadius: 1 }} />
                {label}
              </div>
            ))}
            
            {/* Noise zones */}
            {showNoise && (
              <>
                <div style={{ fontSize: '0.6rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8, marginBottom: 3 }}>
                  <Volume2 size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                  Lärmzonen
                </div>
                {NOISE_ZONES.map((zone) => (
                  <div key={zone.minDb} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', marginTop: 2, color: '#bbb' }}>
                    <div style={{
                      width: 14, height: 8, borderRadius: 2,
                      background: zone.color.replace(/,\s*[\d.]+\)/, ', 0.7)'),
                    }} />
                    {zone.label}
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!legendOpen && (
        <button onClick={() => setLegendOpen(true)} style={{
          position: 'fixed', bottom: 20, left: 12, zIndex: 1000,
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(9,9,11,0.92)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--amber)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Train size={14} />
        </button>
      )}

      {/* Track popup */}
      <AnimatePresence>
        {selectedTrack && (
          <TrackPopup track={selectedTrack} userLocation={pos} onClose={() => setSelectedTrack(null)} />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
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
