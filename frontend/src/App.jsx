import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Start from './pages/Start'
import MapView from './pages/MapView'
import Details from './pages/Details'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/details/:segmentId" element={<Details />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App