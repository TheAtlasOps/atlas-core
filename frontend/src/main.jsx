import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CustomerTrackingView from './pages/CustomerTrackingView.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Portal público del cliente (sin dashboard shell) ── */}
          <Route path="/status/:uuid" element={<CustomerTrackingView />} />
          <Route path="/tracking/:uuid" element={<CustomerTrackingView />} />
          <Route path="/tracking" element={<CustomerTrackingView />} />
          <Route path="/portal" element={<CustomerTrackingView />} />

          {/* ── Dashboard interno de Atlas (con Sidebar + Header) ── */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
