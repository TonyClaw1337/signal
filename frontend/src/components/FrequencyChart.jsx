import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

const FrequencyChart = ({ segmentId }) => {
  const [hourlyData, setHourlyData] = useState([])
  const [pieData, setPieData] = useState([])
  const [activeChart, setActiveChart] = useState('hourly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateMockData()
  }, [segmentId])

  const generateMockData = () => {
    // Generate hourly frequency data (24 hours)
    const hourly = []
    for (let hour = 0; hour < 24; hour++) {
      let passengerTrains, freightTrains
      
      // Simulate realistic patterns
      if (hour >= 6 && hour <= 22) { // Day time
        passengerTrains = Math.floor(Math.random() * 15) + 10 // 10-25 trains
        freightTrains = Math.floor(Math.random() * 8) + 2    // 2-10 trains
      } else { // Night time
        passengerTrains = Math.floor(Math.random() * 3) + 1  // 1-4 trains
        freightTrains = Math.floor(Math.random() * 5) + 2   // 2-7 trains
      }

      hourly.push({
        hour: hour.toString().padStart(2, '0'),
        passenger: passengerTrains,
        freight: freightTrains,
        total: passengerTrains + freightTrains
      })
    }

    // Generate pie chart data
    const totalPassenger = hourly.reduce((sum, h) => sum + h.passenger, 0)
    const totalFreight = hourly.reduce((sum, h) => sum + h.freight, 0)
    
    const pie = [
      { name: 'Personenverkehr', value: totalPassenger, color: '#3b82f6' },
      { name: 'Güterverkehr', value: totalFreight, color: '#ef4444' }
    ]

    setHourlyData(hourly)
    setPieData(pie)
    setLoading(false)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 bg-opacity-95 backdrop-blur-md border border-gray-600 rounded-lg p-3 text-sm">
          <p className="text-gray-300 mb-1">{label}:00 Uhr</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-medium">
              {entry.dataKey === 'passenger' ? 'Personenverkehr' : 'Güterverkehr'}: {entry.value} Züge
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = ((data.value / (pieData[0].value + pieData[1].value)) * 100).toFixed(1)
      return (
        <div className="bg-gray-800 bg-opacity-95 backdrop-blur-md border border-gray-600 rounded-lg p-3 text-sm">
          <p style={{ color: data.color }} className="font-medium">
            {data.name}: {data.value} Züge ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-800 h-64 rounded-lg"></div>
        <div className="animate-pulse bg-gray-800 h-32 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveChart('hourly')}
          className={`btn ${activeChart === 'hourly' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
        >
          <BarChart3 size={16} />
          Stündliche Verteilung
        </button>
        <button
          onClick={() => setActiveChart('split')}
          className={`btn ${activeChart === 'split' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
        >
          <PieChartIcon size={16} />
          Zug-Arten Aufteilung
        </button>
      </div>

      {/* Charts */}
      <motion.div
        key={activeChart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        {activeChart === 'hourly' && (
          <div>
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <BarChart3 size={20} style={{ color: 'var(--amber)' }} />
              Zugfrequenz pro Stunde
            </h3>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="passenger" stackId="a" fill="#3b82f6" name="Personenverkehr" />
                  <Bar dataKey="freight" stackId="a" fill="#ef4444" name="Güterverkehr" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Personenverkehr</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Güterverkehr</span>
              </div>
            </div>
          </div>
        )}

        {activeChart === 'split' && (
          <div>
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <PieChartIcon size={20} style={{ color: 'var(--amber)' }} />
              Verkehrsarten-Verteilung
            </h3>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="h-64 w-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                {pieData.map((item) => {
                  const total = pieData.reduce((sum, d) => sum + d.value, 0)
                  const percentage = ((item.value / total) * 100).toFixed(1)
                  
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-400">
                          {item.value} Züge ({percentage}%)
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-1 lg:grid-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-mono text-amber-400 mb-1">
            {hourlyData.reduce((sum, h) => sum + h.total, 0)}
          </div>
          <div className="text-sm text-gray-400">Züge/Tag (gesamt)</div>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-mono text-blue-400 mb-1">
            {Math.max(...hourlyData.map(h => h.total))}
          </div>
          <div className="text-sm text-gray-400">Max. Züge/Stunde</div>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-mono text-green-400 mb-1">
            {hourlyData.filter(h => h.total > 0).length}
          </div>
          <div className="text-sm text-gray-400">Aktive Stunden</div>
        </div>
      </div>

      {/* Time Pattern Analysis */}
      <div className="card">
        <h3 className="heading-md mb-4 flex items-center gap-2">
          <Calendar size={20} style={{ color: 'var(--amber)' }} />
          Verkehrsmuster
        </h3>
        <div className="grid grid-1 lg:grid-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Tageszeit-Analyse</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Hauptverkehrszeit (6-22h):</span>
                <span className="font-mono text-green-400">
                  {hourlyData.slice(6, 23).reduce((sum, h) => sum + h.total, 0)} Züge
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nachtverkehr (22-6h):</span>
                <span className="font-mono text-blue-400">
                  {[...hourlyData.slice(22), ...hourlyData.slice(0, 6)].reduce((sum, h) => sum + h.total, 0)} Züge
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Spitzenstunden</h4>
            <div className="space-y-2 text-sm">
              {hourlyData
                .map((h, i) => ({ ...h, index: i }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 3)
                .map((h, i) => (
                  <div key={h.hour} className="flex justify-between">
                    <span>{h.hour}:00 - {(parseInt(h.hour) + 1).toString().padStart(2, '0')}:00</span>
                    <span className="font-mono text-amber-400">{h.total} Züge</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FrequencyChart