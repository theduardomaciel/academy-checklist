import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import Spinner from '../components/Spinner'
import { BTN_PRIMARY_BLOCK, CARD, CENTERED_SHELL, FIELD_LABEL, FORM_ERROR, INPUT, PAGE_SUBTITLE, PAGE_TITLE } from '../lib/ui'

export default function Login() {
  const { signInWithPassword, resetPasswordForEmail } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const { error: signInError } = await signInWithPassword(email.trim(), password)
    setLoading(false)
    if (signInError) {
      setError('E-mail ou senha inválidos.')
      return
    }
    navigate('/')
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Digite seu e-mail acima para receber o link de redefinição.')
      return
    }
    setError('')
    const { error: resetError } = await resetPasswordForEmail(email.trim())
    if (resetError) {
      setError('Não foi possível enviar o link. Tente novamente.')
    } else {
      setInfo('Link de redefinição enviado para o seu e-mail.')
    }
  }

  return (
    <div className={`${CENTERED_SHELL} relative flex-col`}>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-7 text-center">
        <img src="/logo-blue.svg" alt="Edge Academy" className="h-14 w-auto" />
      </div>

      <form onSubmit={handleSubmit} className={`${CARD} w-full max-w-[360px]`}>
        <p className={`${PAGE_TITLE} text-center`}>Fechamento do Espaço</p>
        <p className={`${PAGE_SUBTITLE} text-center`}>
          Entre com o e-mail cadastrado pela Edge Academy.
        </p>

        {error && <div className={FORM_ERROR}>{error}</div>}
        {info && <div className={`${FORM_ERROR} bg-success-bg text-success`}>{info}</div>}

        <div className="mb-4">
          <label
            htmlFor="email"
            className={FIELD_LABEL}
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@edgeacademy.com"
            className={INPUT}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className={FIELD_LABEL}
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={INPUT}
          />
        </div>

        <button type="submit" className={BTN_PRIMARY_BLOCK} disabled={loading}>
          {loading ? <Spinner /> : 'Entrar'}
        </button>

        <button
          type="button"
          className="mt-2 inline-flex w-full cursor-pointer items-center justify-center bg-transparent p-2 px-2.5 text-[13px] text-inherit"
          onClick={handleForgotPassword}
        >
          Esqueci minha senha
        </button>
      </form>

      <p className="mt-5 text-xs text-text-muted">
        Não tem uma conta? Peça ao responsável pelo estágio para criá-la.
      </p>
    </div>
  )
}
