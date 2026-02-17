import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import VoiceAgentPage from './pages/VoiceAgentPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pipeline" element={<VoiceAgentPage mode="pipeline" />} />
      <Route path="/realtime" element={<VoiceAgentPage mode="realtime" />} />
    </Routes>
  )
}
