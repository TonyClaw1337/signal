import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMapEvents, useMap } from 'react-leaflet'
import { ArrowLeft, Loader2, Train, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TrackPopup from '../components/TrackPopup'
import L from 'leaflet'

// Fix default marker icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerRetina,
  shadowUrl: markerShadow,
})

const userMarkerIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: var(--amber, #e5a00d);
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(229,160,13,0.5);
      cursor: grab;
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// Debounce hook
function useDebounce(callback, delay) {
  const timerRef = useRef(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay)
  }, [delay])
}

// Component to handle map events and auto-fetch on move
const MapController = ({ onBoundsChange }) => {
  const map = useMap()

  useEffect(() => {
    const handler = () => {
      const bounds = map.getBounds()
      const center = map.getCenter()
      onBoundsChange({ bounds, center, zoom: map.getZoom() })
    }
    map.on('moveend', handler)
    map.on('zoomend', handler)
    // Initial
    handler()
    return () => {
      map.off('moveend', handler)
      map.off('zoomend', handler)
    }
  }, [map, onBoundsChange])

  return null
}

// Click handler for placing marker
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng)
    }
  })
  return null
}

const MapView = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const lat = parseFloat(searchParams.get('lat')) || 51.1875
  const lng = parseFloat(searchParams.get('lng')) || 6.7922
  
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [userLocation, setUserLocation] = useState({ lat, lng })
  const [legendVisible, setLegendVisible] = useState(true)
  const fetchIdRef = useRef(0)

  const fetchTracks = useCallback(async (centerLat, centerLng, radius) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    try {
      const response = await fetch(`/api/tracks?lat=${centerLat}&lng=${centerLng}&radius=${radius}`)
      if (response.ok && id === fetchIdRef.current) {
        const data = await response.json()
        setTracks(data)
      }
    } catch (err) {
      console.error('Error fetching tracks:', err)
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Debounced fetch around marker position
  const debouncedFetch = useDebounce((lat, lng) => {
    fetchTracks(lat, lng, 3000)
  }, 600)

  // Initial fetch
  useEffect(() => {
    fetchTracks(lat, lng, 3000)
  }, [])

  const handleMapClick = useCallback((latlng) => {
    setUserLocation({ lat: latlng.lat, lng: latlng.lng })
    window.history.replaceState({}, '', `/map?lat=${latlng.lat.toFixed(6)}&lng=${latlng.lng.toFixed(6)}`)
    debouncedFetch(latlng.lat, latlng.lng)
  }, [debouncedFetch])

  const handleMarkerDragEnd = useCallback((e) => {
    const pos = e.target.getLatLng()
    setUserLocation({ lat: pos.lat, lng: pos.lng })
    window.history.replaceState({}, '', `/map?lat=${pos.lat.toFixed(6)}&lng=${pos.lng.toFixed(6)}`)
    debouncedFetch(pos.lat, pos.lng)
  }, [debouncedFetch])

  const handleTrackClick = (track) => {
    setSelectedTrack(track)
  }

  const getTrackColor = (trackType) => {
    switch (trackType) {
      case 'main': return '#3b82f6'
      case 'branch': return '#71717a'
      case 'freight': return '#ef4444'
      default: return '#3b82f6'
    }
  }

  const getTrackWeight = (trackType) => {
    switch (trackType) {
      case 'main': return 5
      case 'branch': return 3
      case 'freight': return 4
      default: return 4
    }
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const getDistanceToTrack = (track) => {
    if (!track.geojson_geometry?.coordinates?.length) return null
    let minDist = Infinity
    for (const coord of track.geojson_geometry.coordinates) {
      const d = calculateDistance(userLocation.lat, userLocation.lng, coord[1], coord[0])
      if (d < minDist) minDist = d
    }
    return minDist
  }

  // Dummy bounds handler (we fetch around marker, not bounds)
  const handleBoundsChange = useCallback(() => {}, [])

  return (
    <div className="map-page">
      {/* Floating header */}
      <motion.div 
        className="map-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={16} />
            Zurück
          </button>
          
          <h1 className="heading-md">
            <span style={{ color: 'var(--amber)' }}>SIGNAL</span> Karte
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading && <Loader2 className="animate-spin" size={16} />}
            <span className="text-sm" style={{ color: '#a0a0a0' }}>
              {tracks.length} Gleise
            </span>
          </div>
        </div>
        
        <motion.div 
          className="text-sm"
          style={{ color: '#666', marginTop: '0.25rem', textAlign: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Marker verschieben oder auf Karte tippen
        </motion.div>
      </motion.div>

      {/* Fullscreen Map */}
      <div className="map-container">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: '100vh', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          
          <MapController onBoundsChange={handleBoundsChange} />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {/* Draggable user marker */}
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userMarkerIcon}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center', color: '#333' }}>
                <strong>Standort</strong>
                <br />
                <small style={{ fontFamily: 'monospace' }}>
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </small>
              </div>
            </Popup>
          </Marker>

          {/* Railway tracks as colored polylines */}
          {tracks.map((track) => {
            if (!track.geojson_geometry?.coordinates?.length) return null
            
            const positions = track.geojson_geometry.coordinates.map(c => [c[1], c[0]])
            const color = getTrackColor(track.track_type)
            const weight = getTrackWeight(track.track_type)
            const distance = getDistanceToTrack(track)
            
            return (
              <React.Fragment key={track.id}>
                {/* Glow outline */}
                <Polyline
                  positions={positions}
                  color={color}
                  weight={weight + 6}
                  opacity={0.15}
                />
                {/* Main line */}
                <Polyline
                  positions={positions}
                  color={color}
                  weight={weight}
                  opacity={0.9}
                  eventHandlers={{
                    click: () => handleTrackClick({ ...track, distance })
                  }}
                />
                {/* Dashed center for freight */}
                {track.track_type === 'freight' && (
                  <Polyline
                    positions={positions}
                    color="#fff"
                    weight={1}
                    opacity={0.3}
                    dashArray="4 8"
                  />
                )}
              </React.Fragment>
            )
          })}
        </MapContainer>
      </div>

      {/* Floating legend */}
      <AnimatePresence>
        {legendVisible && (
          <motion.div 
            className="map-legend"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: 0.3 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', margin: 0, fontSize: '0.8rem' }}>
                <Train size={14} style={{ color: 'var(--amber)' }} />
                Gleistypen
              </h4>
              <button
                onClick={() => setLegendVisible(false)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px 6px', fontSize: '0.9rem' }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                <div style={{ width: '1.2rem', height: '3px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
                <span>Hauptstrecke</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                <div style={{ width: '1.2rem', height: '2px', backgroundColor: '#71717a', borderRadius: '2px' }}></div>
                <span>Nebenstrecke</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                <div style={{ width: '1.2rem', height: '3px', backgroundColor: '#ef4444', borderRadius: '2px' }}></div>
                <span>Güterstrecke</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!legendVisible && (
        <motion.button
          onClick={() => setLegendVisible(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '12px',
            zIndex: 1000,
            padding: '0.5rem',
            borderRadius: '50%',
            background: 'rgba(17,17,20,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--amber)',
            cursor: 'pointer'
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Train size={16} />
        </motion.button>
      )}

      {/* Track popup */}
      <AnimatePresence>
        {selectedTrack && (
          <TrackPopup
            track={selectedTrack}
            userLocation={userLocation}
            onClose={() => setSelectedTrack(null)}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem' }}>
              <Loader2 className="animate-spin" size={18} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: '0.85rem' }}>Lade Bahndaten...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MapView