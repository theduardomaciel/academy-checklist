import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const { signInWithPassword, resetPasswordForEmail } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
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
    <div className="centered-shell" style={{ position: 'relative', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/logo-blue.svg" alt="Edge Academy" style={{ height: 56, width: 'auto' }} />
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 360 }}>
        <p className="page-title" style={{ textAlign: 'center' }}>
          Fechamento do Espaço
        </p>
        <p className="page-subtitle" style={{ textAlign: 'center' }}>
          Entre com o e-mail cadastrado pela Edge Academy.
        </p>

        {error && <div className="form-error">{error}</div>}
        {info && (
          <div
            className="form-error"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
          >
            {info}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@edgeacademy.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Entrar'}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 8, fontSize: 13 }}
          onClick={handleForgotPassword}
        >
          Esqueci minha senha
        </button>
      </form>

      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 20 }}>
        Não tem uma conta? Peça ao responsável pelo estágio para criá-la.
      </p>
    </div>
  )
}
