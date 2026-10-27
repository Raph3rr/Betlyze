import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Converter from './pages/Converter'
import Predictions from './pages/Predictions'
import Auth from './pages/Auth'
import ComingSoon from './pages/ComingSoon'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Sidebar />
        <main className="min-h-screen px-5 pb-16 pt-24 lg:pl-72 lg:pr-12 lg:pt-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/converter" element={<Converter />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  )
}
