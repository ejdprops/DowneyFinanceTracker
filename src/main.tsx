import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppMobile from './AppMobile.tsx'
import { isMobileDevice } from './utils/deviceDetection'

const isMobile = isMobileDevice();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMobile ? <AppMobile /> : <App />}
  </StrictMode>,
)
