import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import {
  APP_MAIN,
  BTN_PRIMARY_BLOCK,
  BTN_SECONDARY,
  CARD,
  FIELD_LABEL,
  FORM_ERROR,
  INPUT,
  LIST_NAV,
  PAGE_SUBTITLE,
  PAGE_TITLE
} from '../lib/ui'
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
    <main className={APP_MAIN}>
      <p className={PAGE_TITLE}>Administração · Usuários</p>
      <p className={PAGE_SUBTITLE}>Crie novos usuários e gerencie permissões de administrador.</p>

      {error && <div className={FORM_ERROR}>{error}</div>}
      {notice && <div className={`${CARD} mb-3 border-success`}>{notice}</div>}

      <form className={`${CARD} mb-3 grid gap-3`} onSubmit={handleCreate}>
        <label className="grid gap-1">
          <span className={FIELD_LABEL}>Nome completo</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Maria Silva"
            className={INPUT}
          />
        </label>
        <label className="grid gap-1">
          <span className={FIELD_LABEL}>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@exemplo.com"
            required
            className={INPUT}
          />
        </label>
        <label className="grid gap-1">
          <span className={FIELD_LABEL}>Senha inicial</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            required
            className={INPUT}
          />
        </label>
        <button className={BTN_PRIMARY_BLOCK} type="submit" disabled={creating}>
          {creating ? 'Criando…' : 'Criar usuário'}
        </button>
      </form>

      {loading ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner className="text-primary" />
        </div>
      ) : (
        users.map((u) => (
          <div key={u.id} className={`${CARD} mb-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 mb-1 font-bold">{u.full_name ?? u.email ?? 'Usuário'}</p>
                <p className="m-0 text-[13px] text-text-muted">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.is_admin && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
                    Admin
                  </span>
                )}
                <button
                  className={BTN_SECONDARY}
                  onClick={() => toggleAdmin(u)}
                  title={u.is_admin ? 'Remover admin' : 'Tornar admin'}
                >
                  {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <nav className={LIST_NAV}>
        <Link to="/" className={BTN_SECONDARY}>
          Voltar
        </Link>
        <Link to="/admin/checklists" className={BTN_SECONDARY}>
          Gerenciar checklists
        </Link>
      </nav>
    </main>
  )
}
