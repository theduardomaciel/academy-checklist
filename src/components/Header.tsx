import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import SignOutIcon from './icons/SignOutIcon'
import SettingsIcon from './icons/SettingsIcon'

export default function Header() {
  const { signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-primary px-5 py-3.5 text-primary-contrast shadow-sm">
      <Link to="/" className="flex items-center gap-2.5 no-underline text-inherit">
        <img src="/logo-white.svg" alt="Edge Academy" className="h-7 w-auto" />
        <span className="text-[15px] font-bold leading-[1.15] tracking-[0.2px]">
          Fechamento do Espaço
          <span className="block text-[11px] font-normal opacity-75">Edge Academy</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            className="cursor-pointer bg-transparent p-2 px-2.5 text-inherit"
            onClick={() => navigate('/admin/usuarios')}
            title="Administração"
            aria-label="Administração"
          >
            <SettingsIcon />
          </button>
        )}
        <ThemeToggle />
        <button
          className="cursor-pointer bg-transparent p-2 px-2.5 text-inherit"
          onClick={handleSignOut}
          title="Sair"
          aria-label="Sair"
        >
          <SignOutIcon />
        </button>
      </div>
    </header>
  )
}
