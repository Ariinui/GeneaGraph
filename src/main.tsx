import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
      <PWAUpdatePrompt />
    </HashRouter>
  </StrictMode>,
)
