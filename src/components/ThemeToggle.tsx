import { useTheme } from '../contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import SunIcon from './icons/SunIcon'
import MoonIcon from './icons/MoonIcon'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-inherit hover:bg-white/15 hover:text-inherit"
      onClick={toggleTheme}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
