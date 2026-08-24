import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow/latin-900.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)

// Defer PWA SW registration until after load to avoid render-blocking (PageSpeed)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // @ts-expect-error - virtual module provided by vite-plugin-pwa at build time
    import('virtual:pwa-register').then(({ registerSW }: any) => {
      registerSW({ immediate: true });
    });
  });
}
