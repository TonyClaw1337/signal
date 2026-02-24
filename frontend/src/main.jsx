import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// NEXUS deep linking — notify parent window of route changes for session restore
;(function() {
  if (window.parent === window) return
  const send = () => window.parent.postMessage({ type: 'nexus:route-change', url: window.location.href }, '*')
  const origPush = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)
  history.pushState = (...a) => { origPush(...a); send() }
  history.replaceState = (...a) => { origReplace(...a); send() }
  window.addEventListener('popstate', send)
  window.addEventListener('hashchange', send)
  window.addEventListener('load', send)
})()


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)