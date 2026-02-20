import React from 'react'
import { motion } from 'framer-motion'

const StatCard = ({ label, value, icon: Icon, color = 'amber', trend = null }) => {
  const colors = {
    amber: '#e5a00d',
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    purple: '#8b5cf6',
    orange: '#f59e0b'
  }

  const colorValue = colors[color] || colors.amber

  return (
    <motion.div
      className="stat-card hover:scale-105 transition-transform duration-200"
      whileHover={{ y: -2 }}
    >
      {Icon && (
        <div className="mb-2">
          <Icon size={20} style={{ color: colorValue }} />
        </div>
      )}
      
      <div className="stat-value" style={{ color: colorValue }}>
        {value}
      </div>
      
      <div className="stat-label">{label}</div>
      
      {trend && (
        <div className={`text-xs mt-1 ${
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
        }`}>
          {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
        </div>
      )}
    </motion.div>
  )
}

export default StatCard