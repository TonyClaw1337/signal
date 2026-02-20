import React, { useState, useEffect } from 'react'
import { Volume2, MapPin, Settings, AlertTriangle, Info } from 'lucide-react'
import { motion } from 'framer-motion'

const NoisePanel = ({ segmentId }) => {
  const [distance, setDistance] = useState(100)
  const [noiseData, setNoiseData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    calculateNoise()
  }, [distance, segmentId])

  const calculateNoise = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tracks/${segmentId}/noise?distance=${distance}`)
      if (response.ok) {
        const data = await response.json()
        setNoiseData(data)
      }
    } catch (error) {
      console.error('Error calculating noise:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNoiseLevel = (db) => {
    if (db < 40) return { level: 'Sehr leise', color: '#10b981', desc: 'Kaum hörbar' }
    if (db < 55) return { level: 'Leise', color: '#3b82f6', desc: 'Normale Wohnumgebung' }
    if (db < 70) return { level: 'Mäßig', color: '#f59e0b', desc: 'Verkehrslärm' }
    if (db < 85) return { level: 'Laut', color: '#ef4444', desc: 'Störend' }
    return { level: 'Sehr laut', color: '#dc2626', desc: 'Gesundheitsschädlich' }
  }

  const distanceOptions = [50, 100, 150, 250, 500]

  return (
    <div className="space-y-6">
      {/* Distance Selector */}
      <div className="card">
        <h3 className="heading-md mb-4 flex items-center gap-2">
          <Settings size={20} style={{ color: 'var(--amber)' }} />
          Lärmberechnung Einstellungen
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Entfernung zum Gleis
            </label>
            <div className="flex gap-2 flex-wrap">
              {distanceOptions.map((dist) => (
                <button
                  key={dist}
                  onClick={() => setDistance(dist)}
                  className={`px-3 py-1 text-sm rounded ${
                    distance === dist 
                      ? 'bg-amber-500 text-black' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {dist}m
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin size={14} />
            <span>Aktuell gewählte Distanz: {distance} Meter</span>
          </div>
        </div>
      </div>

      {/* Noise Results */}
      {loading ? (
        <div className="card animate-pulse">
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      ) : noiseData ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Noise Level Cards */}
          <div className="grid grid-1 lg:grid-3 gap-4">
            <NoiseCard
              title="Tag-Pegel"
              value={noiseData.day_level_db}
              description="6:00 - 22:00 Uhr"
              icon="☀️"
            />
            <NoiseCard
              title="Nacht-Pegel"
              value={noiseData.night_level_db}
              description="22:00 - 6:00 Uhr"
              icon="🌙"
            />
            <NoiseCard
              title="Max-Pegel"
              value={noiseData.max_level_db}
              description="Einzelner Güterzug"
              icon="📢"
            />
          </div>

          {/* Visual Noise Scale */}
          <div className="card">
            <h4 className="heading-md mb-4 flex items-center gap-2">
              <Volume2 size={20} style={{ color: 'var(--amber)' }} />
              Lärmkategorie
            </h4>
            
            <NoiseScale currentLevel={noiseData.day_level_db} />
          </div>

          {/* Health Impact */}
          <div className="card">
            <h4 className="heading-md mb-4 flex items-center gap-2">
              <AlertTriangle size={20} style={{ color: 'var(--amber)' }} />
              Gesundheitliche Einschätzung
            </h4>
            
            <div className="space-y-3">
              <HealthAssessment level={noiseData.day_level_db} timeOfDay="Tag" />
              <HealthAssessment level={noiseData.night_level_db} timeOfDay="Nacht" />
            </div>
          </div>

          {/* Technical Details */}
          <div className="card">
            <h4 className="heading-md mb-4 flex items-center gap-2">
              <Info size={20} style={{ color: 'var(--amber)' }} />
              Berechnungsdetails
            </h4>
            
            <div className="grid grid-1 lg:grid-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold mb-2">Berechnungsparameter</h5>
                <div className="space-y-1 text-gray-400">
                  <div>Entfernung: {distance} Meter</div>
                  <div>Referenzdistanz: 25 Meter</div>
                  <div>Dämpfung: 6dB pro Entfernungsverdopplung</div>
                </div>
              </div>
              
              <div>
                <h5 className="font-semibold mb-2">Annahmen</h5>
                <div className="space-y-1 text-gray-400">
                  <div>Personenzug: 75 dB (25m)</div>
                  <div>Güterzug: 85 dB (25m)</div>
                  <div>Frequenzkorrektur angewendet</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-20 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <Info size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-yellow-400">Hinweis:</strong> Dies ist eine vereinfachte Lärmberechnung. 
                  Für genauere Messungen konsultieren Sie einen Lärmschutzexperten. Faktoren wie 
                  Topografie, Bebauung und Wetter werden nicht berücksichtigt.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          Lärmberechnung konnte nicht durchgeführt werden
        </div>
      )}
    </div>
  )
}

// Noise level card component
const NoiseCard = ({ title, value, description, icon }) => {
  const noiseInfo = getNoiseLevel(value)
  
  return (
    <div className="card text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-mono mb-1" style={{ color: noiseInfo.color }}>
        {value} dB
      </div>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="text-xs text-gray-400">{description}</div>
      <div className="text-xs mt-2 px-2 py-1 rounded-full" style={{ 
        backgroundColor: `${noiseInfo.color}20`, 
        color: noiseInfo.color 
      }}>
        {noiseInfo.level}
      </div>
    </div>
  )
}

// Visual noise scale
const NoiseScale = ({ currentLevel }) => {
  const levels = [
    { min: 0, max: 40, label: 'Sehr leise', color: '#10b981', examples: 'Bibliothek' },
    { min: 40, max: 55, label: 'Leise', color: '#3b82f6', examples: 'Wohngebiet' },
    { min: 55, max: 70, label: 'Mäßig', color: '#f59e0b', examples: 'Büro' },
    { min: 70, max: 85, label: 'Laut', color: '#ef4444', examples: 'Verkehr' },
    { min: 85, max: 120, label: 'Sehr laut', color: '#dc2626', examples: 'Baustelle' }
  ]

  return (
    <div className="space-y-3">
      {levels.map((level) => {
        const isActive = currentLevel >= level.min && currentLevel < level.max
        
        return (
          <div key={level.min} className={`p-3 rounded-lg border ${
            isActive 
              ? 'border-amber-500 bg-amber-500 bg-opacity-10' 
              : 'border-gray-700 bg-gray-800 bg-opacity-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: level.color }}
                ></div>
                <div>
                  <div className="font-medium">{level.label}</div>
                  <div className="text-sm text-gray-400">{level.examples}</div>
                </div>
              </div>
              <div className="text-sm font-mono text-gray-400">
                {level.min}-{level.max === 120 ? '120+' : level.max} dB
              </div>
            </div>
            
            {isActive && (
              <div className="mt-2 text-sm text-amber-400">
                ← Ihr berechneter Lärmpegel liegt in dieser Kategorie
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Health assessment component
const HealthAssessment = ({ level, timeOfDay }) => {
  const getHealthImpact = (db, isNight) => {
    const nightBonus = isNight ? 5 : 0 // Night time is more sensitive
    const adjustedLevel = db + nightBonus
    
    if (adjustedLevel < 40) {
      return { level: 'Unbedenklich', color: '#10b981', advice: 'Keine gesundheitlichen Bedenken.' }
    }
    if (adjustedLevel < 55) {
      return { level: 'Akzeptabel', color: '#3b82f6', advice: 'Geringe Beeinträchtigung möglich.' }
    }
    if (adjustedLevel < 70) {
      return { level: 'Grenzwertig', color: '#f59e0b', advice: 'Lärm kann störend wirken. Lärmschutzmaßnahmen empfohlen.' }
    }
    if (adjustedLevel < 85) {
      return { level: 'Problematisch', color: '#ef4444', advice: 'Deutliche Belästigung. Lärmschutz dringend empfohlen.' }
    }
    return { 
      level: 'Gesundheitsschädlich', 
      color: '#dc2626', 
      advice: 'Gesundheitsgefährdung möglich. Professionelle Lärmschutzberatung erforderlich.' 
    }
  }

  const impact = getHealthImpact(level, timeOfDay === 'Nacht')

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ 
      backgroundColor: `${impact.color}15`,
      border: `1px solid ${impact.color}40`
    }}>
      <div 
        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
        style={{ backgroundColor: impact.color }}
      ></div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{timeOfDay}</span>
          <span 
            className="text-sm px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: impact.color, 
              color: timeOfDay === 'Nacht' ? '#000' : '#fff'
            }}
          >
            {impact.level}
          </span>
        </div>
        <div className="text-sm text-gray-300">
          {impact.advice}
        </div>
      </div>
    </div>
  )
}

// Helper function (moved outside component)
const getNoiseLevel = (db) => {
  if (db < 40) return { level: 'Sehr leise', color: '#10b981', desc: 'Kaum hörbar' }
  if (db < 55) return { level: 'Leise', color: '#3b82f6', desc: 'Normale Wohnumgebung' }
  if (db < 70) return { level: 'Mäßig', color: '#f59e0b', desc: 'Verkehrslärm' }
  if (db < 85) return { level: 'Laut', color: '#ef4444', desc: 'Störend' }
  return { level: 'Sehr laut', color: '#dc2626', desc: 'Gesundheitsschädlich' }
}

export default NoisePanel