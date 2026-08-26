import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Spinner } from '../components/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormError, FormField, PageTitle } from '../components/PageShell'

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
    <div className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
        <Card>
          <CardContent>
            <PageTitle>Nova senha</PageTitle>
            {error && <FormError>{error}</FormError>}
            {done ? (
              <p className="text-center text-success">Senha atualizada! Redirecionando...</p>
            ) : (
              <>
                <FormField label="Nova senha" htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormField>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Spinner /> : 'Salvar senha'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
