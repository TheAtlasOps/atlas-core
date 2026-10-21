import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import CustomerTrackingView from './pages/CustomerTrackingView.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Autenticación de acceso a la empresa ── */}
            <Route path="/login" element={<Login />} />

            {/* ── Portal público del cliente (sin dashboard shell / acceso con Magic Link) ── */}
            <Route path="/status/:uuid" element={<CustomerTrackingView />} />
            <Route path="/tracking/:uuid" element={<CustomerTrackingView />} />
            <Route path="/tracking" element={<CustomerTrackingView />} />
            <Route path="/portal" element={<CustomerTrackingView />} />

            {/* ── Dashboard interno de Atlas resguardado con ProtectedRoute ── */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
