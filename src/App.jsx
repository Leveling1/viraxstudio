import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ChannelSetup from './pages/ChannelSetup.jsx'
import ScriptGen from './pages/ScriptGen.jsx'
import VideoBuilder from './pages/VideoBuilder.jsx'
import Publisher from './pages/Publisher.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('virax_config') || '{}') } catch { return {} }
  })
  const saveConfig = (updates) => {
    const next = { ...config, ...updates }
    setConfig(next)
    localStorage.setItem('virax_config', JSON.stringify(next))
  }
  const ctx = { config, saveConfig }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout ctx={ctx} />}>
          <Route index element={<Dashboard ctx={ctx} />} />
          <Route path="channel" element={<ChannelSetup ctx={ctx} />} />
          <Route path="script" element={<ScriptGen ctx={ctx} />} />
          <Route path="video" element={<VideoBuilder ctx={ctx} />} />
          <Route path="publish" element={<Publisher ctx={ctx} />} />
          <Route path="settings" element={<Settings ctx={ctx} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
