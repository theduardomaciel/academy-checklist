import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <Link
        to="/"
        className="app-header__brand"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <img src="/logo-white.svg" alt="Edge Academy" />
        <span className="app-header__brand-text">
          Fechamento do Espaço
          <span>Edge Academy</span>
        </span>
      </Link>
      <div className="app-header__actions">
        <ThemeToggle />
        <button className="btn-ghost" onClick={handleSignOut} title="Sair" aria-label="Sair">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}
