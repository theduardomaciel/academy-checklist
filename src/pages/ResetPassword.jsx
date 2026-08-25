import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError('Não foi possível atualizar a senha. O link pode ter expirado.')
      return
    }
    setDone(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="centered-shell">
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 360 }}>
        <p className="page-title" style={{ textAlign: 'center' }}>
          Nova senha
        </p>
        {error && <div className="form-error">{error}</div>}
        {done ? (
          <p style={{ textAlign: 'center', color: 'var(--color-success)' }}>
            Senha atualizada! Redirecionando...
          </p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="password">Nova senha</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Salvar senha'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
