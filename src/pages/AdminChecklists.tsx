import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { AdminChecklistTemplate, ChecklistItem } from '../types'

interface TemplateWithItems extends AdminChecklistTemplate {
  checklist_items: ChecklistItem[]
}

export default function AdminChecklists() {
  const [templates, setTemplates] = useState<TemplateWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // New-template form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    const templatesResult = await supabase
      .from('checklist_templates')
      .select('*, checklist_items(*)')
      .order('created_at', { ascending: true })
      .order('order_index', { ascending: true, foreignTable: 'checklist_items' })

    if (templatesResult.error) {
      setError('Não foi possível carregar os checklists.')
    } else {
      setTemplates((templatesResult.data ?? []) as unknown as TemplateWithItems[])
    }
    setLoading(false)
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setError('')
    setNotice('')
    const { data, error: insertError } = await supabase
      .from('checklist_templates')
      .insert({ name: name.trim(), description: description.trim() || null })
      .select()
      .single()

    if (insertError) {
      setError('Não foi possível criar o checklist.')
    } else {
      const template = data as AdminChecklistTemplate
      setTemplates((prev) => [...prev, { ...template, checklist_items: [] }])
      setName('')
      setDescription('')
      setNotice(`Checklist "${template.name}" criado. Adicione os itens abaixo.`)
    }
    setCreating(false)
  }

  async function toggleActive(template: TemplateWithItems) {
    setError('')
    const { error: updateError } = await supabase
      .from('checklist_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)

    if (updateError) {
      setError('Não foi possível atualizar o checklist.')
      return
    }
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, is_active: !template.is_active } : t))
    )
  }

  async function deleteTemplate(template: TemplateWithItems) {
    if (!confirm(`Excluir o checklist "${template.name}" e todos os seus itens?`)) return
    setError('')
    const { error: deleteError } = await supabase
      .from('checklist_templates')
      .delete()
      .eq('id', template.id)

    if (deleteError) {
      setError('Não foi possível excluir o checklist.')
      return
    }
    setTemplates((prev) => prev.filter((t) => t.id !== template.id))
  }

  async function addItem(templateId: string) {
    setError('')
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    const nextOrder = template.checklist_items.length + 1
    const title = prompt(`Título do item ${nextOrder}:`)
    if (!title?.trim()) return
    const instructions = prompt('Instruções (opcional):') ?? null
    const requiresPhoto = confirm('Este item exige foto?')

    const { data, error: insertError } = await supabase
      .from('checklist_items')
      .insert({
        template_id: templateId,
        order_index: nextOrder,
        title: title.trim(),
        instructions: instructions?.trim() || null,
        requires_photo: requiresPhoto
      })
      .select()
      .single()

    if (insertError) {
      setError('Não foi possível adicionar o item.')
      return
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, checklist_items: [...t.checklist_items, data as ChecklistItem] }
          : t
      )
    )
  }

  async function removeItem(templateId: string, itemId: string) {
    setError('')
    const { error: deleteError } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      setError('Não foi possível remover o item.')
      return
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, checklist_items: t.checklist_items.filter((i) => i.id !== itemId) }
          : t
      )
    )
  }

  return (
    <main className="app-main">
      <p className="page-title">Administração · Checklists</p>
      <p className="page-subtitle">Configure os checklists disponíveis no app.</p>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="card" style={{ borderColor: 'var(--color-success)' }}>{notice}</div>}

      <form className="card" onSubmit={handleCreateTemplate} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }}>Nome do checklist</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fechamento da sala X"
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }}>Descrição</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? 'Criando…' : 'Criar checklist'}
        </button>
      </form>

      {loading ? (
        <div className="centered-shell">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        templates.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, margin: '0 0 4px' }}>
                  {t.name}{' '}
                  {!t.is_active && <span className="badge badge-warning">Inativo</span>}
                </p>
                {t.description && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                    {t.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => toggleActive(t)}>
                  {t.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button className="btn btn-secondary" onClick={() => deleteTemplate(t)}>
                  Excluir
                </button>
              </div>
            </div>

            <ol style={{ margin: '12px 0 0', paddingLeft: 20 }}>
              {t.checklist_items.map((item) => (
                <li key={item.id} style={{ marginBottom: 6 }}>
                  <span>{item.title}</span>
                  {item.requires_photo && <span className="badge badge-muted"> 📷</span>}
                  <button
                    className="btn-ghost"
                    onClick={() => removeItem(t.id, item.id)}
                    title="Remover item"
                    aria-label={`Remover ${item.title}`}
                    style={{ marginLeft: 8 }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>

            <button
              className="btn btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => addItem(t.id)}
            >
              Adicionar item
            </button>
          </div>
        ))
      )}

      <nav className="list-nav">
        <Link to="/" className="btn btn-secondary">
          Voltar
        </Link>
        <Link to="/admin/usuarios" className="btn btn-secondary">
          Gerenciar usuários
        </Link>
      </nav>
    </main>
  )
}
