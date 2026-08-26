import { useTheme } from '../contexts/ThemeContext'
import SunIcon from './icons/SunIcon'
import MoonIcon from './icons/MoonIcon'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      className="flex size-[38px] cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-inherit hover:bg-white/25"
      onClick={toggleTheme}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
