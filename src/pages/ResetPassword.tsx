import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import { BTN_PRIMARY_BLOCK, CARD, CENTERED_SHELL, FIELD_LABEL, FORM_ERROR, INPUT, PAGE_TITLE } from '../lib/ui'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
    <div className={CENTERED_SHELL}>
      <form onSubmit={handleSubmit} className={`${CARD} w-full max-w-[360px]`}>
        <p className={`${PAGE_TITLE} text-center`}>Nova senha</p>
        {error && <div className={FORM_ERROR}>{error}</div>}
        {done ? (
          <p className="text-center text-success">Senha atualizada! Redirecionando...</p>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="password" className={FIELD_LABEL}>
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
              />
            </div>
            <button type="submit" className={BTN_PRIMARY_BLOCK} disabled={loading}>
              {loading ? <Spinner /> : 'Salvar senha'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
