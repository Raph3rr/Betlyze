import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Converter from './pages/Converter'
import Predictions from './pages/Predictions'
import Book from './pages/Book'
import Auth from './pages/Auth'
import Settings from './pages/Settings'

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('betlyze-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.content = theme === 'dark' ? '#020713' : '#eaf0f6'
    try { localStorage.setItem('betlyze-theme', theme) } catch {}
  }, [theme])

  return (
    <BrowserRouter>
      <AuthProvider>
        <Sidebar theme={theme} onToggleTheme={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} />
        <main className="min-h-screen px-5 pb-16 pt-24 lg:pl-72 lg:pr-12 lg:pt-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/converter" element={<Converter />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/book" element={<Book />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  )
}
