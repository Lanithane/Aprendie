import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { DailyUsageProvider } from './usage/DailyUsageContext'
import { ThemeModeProvider } from './ThemeModeProvider'
import { FeedbackProvider } from './components/Feedback/FeedbackProvider'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/lilita-one/400.css' // blocky display face for the Aprendie brand wordmark

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AuthProvider>
      <DailyUsageProvider>
        <ThemeModeProvider>
          <BrowserRouter>
            <FeedbackProvider>
              <App />
            </FeedbackProvider>
          </BrowserRouter>
        </ThemeModeProvider>
      </DailyUsageProvider>
    </AuthProvider>
  </React.StrictMode>
)
