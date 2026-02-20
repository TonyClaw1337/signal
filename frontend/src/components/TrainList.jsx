import React, { useState, useEffect } from 'react'
import { Clock, Train, Navigation, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

const TrainList = ({ segmentId }) => {
  const [trains, setTrains] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrains()
    const interval = setInterval(fetchTrains, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [segmentId])

  const fetchTrains = async () => {
    try {
      const response = await fetch(`/api/tracks/${segmentId}/trains?hours=12`)
      if (response.ok) {
        const data = await response.json()
        setTrains(data.filter(train => train.minutes_until >= -5)) // Include recently departed
      }
    } catch (error) {
      console.error('Error fetching trains:', error)
    } finally {
      setLoading(false)
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

  const getTimeStatus = (minutesUntil) => {
    if (minutesUntil < 0) return { text: 'Vorbei', color: 'text-gray-500' }
    if (minutesUntil === 0) return { text: 'Jetzt', color: 'text-amber-400' }
    if (minutesUntil < 5) return { text: `${minutesUntil}min`, color: 'text-red-400' }
    if (minutesUntil < 15) return { text: `${minutesUntil}min`, color: 'text-amber-400' }
    return { text: `${minutesUntil}min`, color: 'text-green-400' }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-800 h-16 rounded-lg"></div>
        ))}
      </div>
    )
  }

  if (trains.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Train size={48} className="mx-auto mb-4 opacity-50" />
        <p>Keine Zugdaten verfügbar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-md">Nächste Züge</h2>
        <span className="text-sm text-gray-400">
          {trains.filter(t => t.minutes_until >= 0).length} kommende Züge
        </span>
      </div>

      {trains.map((train, index) => {
        const timeStatus = getTimeStatus(train.minutes_until)
        
        return (
          <motion.div
            key={`${train.id}-${index}`}
            className={`card hover:bg-opacity-80 transition-all ${
              train.minutes_until < 0 ? 'opacity-60' : ''
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              {/* Train Info */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getTrainTypeColor(train.train_type) }}
                ></div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {train.train_number}
                    </span>
                    {train.train_type === 'fernverkehr' && (
                      <Zap size={14} className="text-blue-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <span>{getTrainTypeLabel(train.train_type)}</span>
                    <span>•</span>
                    <span>{train.operator}</span>
                  </div>
                </div>
              </div>

              {/* Direction & Speed */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-400">
                  <Navigation size={14} />
                  <span>{train.direction}</span>
                </div>
                
                {train.speed_kmh && (
                  <div className="text-mono text-gray-400">
                    {train.speed_kmh} km/h
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="text-right flex-shrink-0">
                <div className={`font-mono text-lg ${timeStatus.color}`}>
                  {timeStatus.text}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(train.scheduled_time).toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>

            {/* Progress bar for imminent trains */}
            {train.minutes_until >= 0 && train.minutes_until <= 10 && (
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="h-1 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${Math.max(0, (10 - train.minutes_until) * 10)}%`,
                      backgroundColor: timeStatus.color.includes('red') ? '#ef4444' : 
                                     timeStatus.color.includes('amber') ? '#f59e0b' : '#10b981'
                    }}
                  ></div>
                </div>
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Legend */}
      <div className="card bg-gray-800 bg-opacity-50 mt-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Train size={16} style={{ color: 'var(--amber)' }} />
          Zugart-Legende
        </h4>
        <div className="grid grid-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Fernverkehr (ICE, IC)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Regionalverkehr (RE, RB)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>S-Bahn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Güterverkehr</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainList