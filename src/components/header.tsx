import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import ThemeToggle from './theme-toggle'

export default function Header() {
  const { signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-brand-navy px-5 py-3.5 text-white shadow-sm dark:bg-primary">
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <img src="/logo-white.svg" alt="Edge Academy" className="h-7 w-auto" />
        <span className="text-[15px] leading-[1.15] font-bold tracking-[0.2px]">
          Fechamento do Espaço
          <span className="block text-[11px] font-normal opacity-75">Edge Academy</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-inherit hover:bg-white/15 hover:text-inherit"
            onClick={() => navigate('/admin/usuarios')}
            title="Administração"
            aria-label="Administração"
          >
            <Settings />
          </Button>
        )}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-inherit hover:bg-white/15 hover:text-inherit"
          onClick={handleSignOut}
          title="Sair"
          aria-label="Sair"
        >
          <LogOut />
        </Button>
      </div>
    </header>
  )
}
