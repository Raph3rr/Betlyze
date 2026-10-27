import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const signup = async (body) => setUser((await api('/api/signup', body)).user)
  const login = async (body) => setUser((await api('/api/login', body)).user)
  const logout = async () => { await api('/api/logout', {}); setUser(null) }

  return <AuthCtx.Provider value={{ user, setUser, loading, signup, login, logout }}>{children}</AuthCtx.Provider>
}
