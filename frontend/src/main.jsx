import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import MagicLinkPortal from './pages/MagicLinkPortal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ── Portal público del cliente (sin dashboard shell) ── */}
        <Route path="/status/:uuid" element={<MagicLinkPortal />} />

        {/* ── Dashboard interno de Atlas (con Sidebar + Header) ── */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
