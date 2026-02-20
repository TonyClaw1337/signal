import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Train, BarChart3, Volume2, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import TrainList from '../components/TrainList'
import FrequencyChart from '../components/FrequencyChart'
import NoisePanel from '../components/NoisePanel'
import StatCard from '../components/StatCard'

const Details = () => {
  const { segmentId } = useParams()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('trains')
  const [trackData, setTrackData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrackData()
  }, [segmentId])

  const fetchTrackData = async () => {
    setLoading(true)
    try {
      // Fetch basic track info (mock for now)
      setTrackData({
        id: segmentId,
        name: `Gleisstrecke ${segmentId}`,
        track_type: 'main',
        electrified: true,
        multi_track: true
      })
    } catch (error) {
      console.error('Error fetching track data:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'trains', label: 'Nächste Züge', icon: Train },
    { id: 'frequency', label: 'Taktanalyse', icon: BarChart3 },
    { id: 'stats', label: 'Statistik', icon: Activity },
    { id: 'noise', label: 'Lärmanalyse', icon: Volume2 },
  ]

  const getTrackTypeLabel = (type) => {
    switch (type) {
      case 'main': return 'Hauptstrecke'
      case 'branch': return 'Nebenstrecke'
      case 'freight': return 'Güterstrecke'
      default: return 'Bahnstrecke'
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--bg-dark)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div className="card-glass text-center" style={{ padding: '2rem' }}>
          <div 
            className="animate-spin" 
            style={{ 
              width: '2rem', 
              height: '2rem', 
              border: '2px solid var(--amber)', 
              borderTop: '2px solid transparent', 
              borderRadius: '50%', 
              margin: '0 auto 1rem' 
            }}
          ></div>
          <p>Lade Gleisdaten...</p>
        </div>
      </div>
    )
  }

  if (!trackData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--bg-dark)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div className="card-glass text-center" style={{ padding: '2rem' }}>
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>
            Gleisdaten konnten nicht geladen werden
          </p>
          <button 
            onClick={() => navigate('/map')}
            className="btn btn-secondary"
          >
            Zurück zur Karte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Header */}
      <motion.header 
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '1rem'
        }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button 
              onClick={() => navigate('/map')}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={16} />
              Zurück
            </button>
            
            <div style={{ flex: 1 }}>
              <h1 className="heading-lg">{trackData.name}</h1>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#a0a0a0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}>
                <Train size={14} />
                {getTrackTypeLabel(trackData.track_type)}
                {trackData.electrified && ' • Elektrifiziert'}
                {trackData.multi_track && ' • Mehrgleisig'}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === tab.id ? 'var(--amber)' : 'var(--bg-card)',
                    color: activeTab === tab.id ? 'var(--bg-dark)' : '#d1d5db',
                    fontWeight: activeTab === tab.id ? '500' : '400'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.backgroundColor = 'rgba(40, 40, 40, 0.95)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.backgroundColor = 'var(--bg-card)'
                    }
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container" style={{ padding: '1rem' }}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {activeTab === 'trains' && <TrainList segmentId={segmentId} />}
          {activeTab === 'frequency' && <FrequencyChart segmentId={segmentId} />}
          {activeTab === 'stats' && <StatsView segmentId={segmentId} />}
          {activeTab === 'noise' && <NoisePanel segmentId={segmentId} />}
        </motion.div>
      </main>
    </div>
  )
}

// Stats overview component
const StatsView = ({ segmentId }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [segmentId])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/tracks/${segmentId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="animate-pulse" 
            style={{ 
              backgroundColor: '#374151', 
              height: '6rem', 
              borderRadius: '0.5rem' 
            }}
          ></div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem 0', 
        color: '#9ca3af' 
      }}>
        Statistikdaten konnten nicht geladen werden
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-2" style={{ gap: '1rem' }}>
        <StatCard
          label="Züge/Tag (Ø)"
          value={stats.trains_per_day}
          icon={Train}
          color="amber"
        />
        <StatCard
          label="Züge/Nacht (22-06)"
          value={stats.trains_per_night}
          icon={Train}
          color="blue"
        />
        <StatCard
          label="Max/Stunde"
          value={stats.max_per_hour}
          icon={BarChart3}
          color="green"
        />
        <StatCard
          label="Güterverkehr"
          value={`${(stats.freight_percentage * 100).toFixed(0)}%`}
          icon={Activity}
          color="red"
        />
      </div>

      <div className="grid" style={{ gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <h3 className="heading-md mb-4">Durchschnittsgeschwindigkeit</h3>
          <div style={{ 
            fontSize: '2rem', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--amber)', 
            marginBottom: '0.5rem' 
          }}>
            {stats.avg_speed.toFixed(0)} km/h
          </div>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Basierend auf Fahrplandaten und Streckentyp
          </p>
        </div>

        <div className="card">
          <h3 className="heading-md mb-4">Verkehrsverteilung</h3>
          <div className="space-y-2">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Personenverkehr</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#3b82f6' }}>
                {(100 - stats.freight_percentage * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Güterverkehr</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                {(stats.freight_percentage * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Details