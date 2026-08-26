import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
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
    <main className="app-main">
      <p className="page-title">Administração · Usuários</p>
      <p className="page-subtitle">Crie novos usuários e gerencie permissões de administrador.</p>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="card" style={{ borderColor: 'var(--color-success)' }}>{notice}</div>}

      <form className="card" onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }}>Nome completo</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Maria Silva"
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }}>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@exemplo.com"
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }}>Senha inicial</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? 'Criando…' : 'Criar usuário'}
        </button>
      </form>

      {loading ? (
        <div className="centered-shell">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        users.map((u) => (
          <div key={u.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, margin: '0 0 4px' }}>
                  {u.full_name ?? u.email ?? 'Usuário'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>{u.email}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {u.is_admin && <span className="badge badge-success">Admin</span>}
                <button
                  className="btn btn-secondary"
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

      <nav className="list-nav">
        <Link to="/" className="btn btn-secondary">
          Voltar
        </Link>
        <Link to="/admin/checklists" className="btn btn-secondary">
          Gerenciar checklists
        </Link>
      </nav>
    </main>
  )
}
