import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Train, Clock, ArrowRight, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

const TrackPopup = ({ track, userLocation, onClose }) => {
  const navigate = useNavigate()
  const [nextTrain, setNextTrain] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNextTrain()
  }, [track.id])

  const fetchNextTrain = async () => {
    try {
      const response = await fetch(`/api/tracks/${track.id}/trains?hours=2`)
      if (response.ok) {
        const trains = await response.json()
        setNextTrain(trains[0] || null)
      }
    } catch (error) {
      console.error('Error fetching next train:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)} m`
    }
    return `${(distance / 1000).toFixed(1)} km`
  }

  const getTrackTypeLabel = (type) => {
    switch (type) {
      case 'main': return 'Hauptstrecke'
      case 'branch': return 'Nebenstrecke'
      case 'freight': return 'Güterstrecke'
      default: return 'Bahnstrecke'
    }
  }

  const getTrainTypeLabel = (type) => {
    switch (type) {
      case 'fernverkehr': return 'Fernverkehr'
      case 'regionalverkehr': return 'Regionalverkehr'
      case 'gueterverkehr': return 'Güterverkehr'
      case 'sbahn': return 'S-Bahn'
      default: return type
    }
  }

  const getTrainTypeColor = (type) => {
    switch (type) {
      case 'fernverkehr': return '#3b82f6'
      case 'regionalverkehr': return '#10b981'
      case 'gueterverkehr': return '#ef4444'
      case 'sbahn': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 999
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <motion.div
        className="track-popup visible"
        initial={{ transform: 'translateY(100%)' }}
        animate={{ transform: 'translateY(0)' }}
        exit={{ transform: 'translateY(100%)' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h3 className="heading-md" style={{ marginBottom: '0.25rem' }}>{track.name}</h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#a0a0a0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem' 
            }}>
              <Train size={14} />
              {getTrackTypeLabel(track.track_type)}
              {track.electrified && ' • Elektrifiziert'}
              {track.multi_track && ' • Mehrgleisig'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.25rem', marginLeft: '0.5rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Distance */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          <MapPin size={14} style={{ color: 'var(--amber)' }} />
          <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
            {track.distance ? formatDistance(track.distance) : '---'} entfernt
          </span>
        </div>

        {/* Next Train */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Clock size={14} />
            Nächster Zug
          </h4>
          
          {loading ? (
            <div 
              className="animate-pulse" 
              style={{ 
                backgroundColor: '#374151', 
                height: '4rem', 
                borderRadius: '0.5rem' 
              }}
            ></div>
          ) : nextTrain ? (
            <div style={{ 
              backgroundColor: 'rgba(55, 65, 81, 0.5)', 
              borderRadius: '0.5rem', 
              padding: '0.75rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div 
                    style={{
                      width: '0.75rem',
                      height: '0.75rem',
                      borderRadius: '50%',
                      backgroundColor: getTrainTypeColor(nextTrain.train_type)
                    }}
                  ></div>
                  <div>
                    <div className="font-medium">{nextTrain.train_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0a0' }}>
                      {getTrainTypeLabel(nextTrain.train_type)} • {nextTrain.direction}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div 
                    className="font-mono" 
                    style={{ 
                      fontSize: '1.125rem', 
                      color: 'var(--amber)' 
                    }}
                  >
                    {nextTrain.minutes_until > 0 ? `${nextTrain.minutes_until}min` : 'Jetzt'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a0a0a0' }}>
                    {new Date(nextTrain.scheduled_time).toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#a0a0a0', fontSize: '0.875rem', fontStyle: 'italic' }}>
              Keine aktuellen Zugdaten verfügbar
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate(`/details/${track.id}`)}
            className="btn btn-primary w-full"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem' 
            }}
          >
            Details anzeigen
            <ArrowRight size={16} />
          </button>
          
          <button
            onClick={onClose}
            className="btn btn-ghost w-full"
          >
            Schließen
          </button>
        </div>
      </motion.div>
    </>
  )
}

export default TrackPopup