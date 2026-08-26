import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import {
  BottomNav,
  CenteredLoader,
  FormError,
  FormField,
  Notice,
  PageMain,
  PageSubtitle,
  PageTitle
} from '../components/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { AdminUser } from '../types'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // New-user form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('list_users')
    if (rpcError) {
      setError('Não foi possível carregar os usuários.')
    } else {
      setUsers((data ?? []) as unknown as AdminUser[])
    }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (!email.trim() || password.length < 6) {
      setError('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.')
      return
    }

    setCreating(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim() })
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error ?? 'Não foi possível criar o usuário.')
      }

      setEmail('')
      setFullName('')
      setPassword('')
      setNotice(`Usuário ${email.trim()} criado com sucesso.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao criar o usuário.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleAdmin(target: AdminUser) {
    setError('')
    setNotice('')
    const { error: rpcError } = await supabase.rpc('set_user_admin', {
      target_uid: target.id,
      admin_flag: !target.is_admin
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === target.id ? { ...u, is_admin: !target.is_admin } : u))
    )
  }

  return (
    <PageMain>
      <PageTitle>Administração · Usuários</PageTitle>
      <PageSubtitle>Crie novos usuários e gerencie permissões de administrador.</PageSubtitle>

      {error && <FormError>{error}</FormError>}
      {notice && <Notice>{notice}</Notice>}

      <form className="mb-3" onSubmit={handleCreate}>
        <Card>
          <CardContent className="gap-3">
            <FormField label="Nome completo">
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maria Silva"
              />
            </FormField>
            <FormField label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@exemplo.com"
                required
              />
            </FormField>
            <FormField label="Senha inicial">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? 'Criando…' : 'Criar usuário'}
            </Button>
          </CardContent>
        </Card>
      </form>

      {loading ? (
        <CenteredLoader />
      ) : (
        users.map((u) => (
          <Card key={u.id} className="mb-3 shadow-sm">
            <CardContent className="flex-row items-center justify-between gap-3">
              <div>
                <p className="m-0 mb-1 font-bold">{u.full_name ?? u.email ?? 'Usuário'}</p>
                <p className="m-0 text-[13px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.is_admin && <Badge className="bg-success-bg text-success">Admin</Badge>}
                <Button variant="outline" size="sm" onClick={() => toggleAdmin(u)}>
                  {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <BottomNav>
        <Button variant="outline" render={<Link to="/" />}>
          Voltar
        </Button>
        <Button variant="outline" render={<Link to="/admin/checklists" />}>
          Gerenciar checklists
        </Button>
      </BottomNav>
    </PageMain>
  )
}
