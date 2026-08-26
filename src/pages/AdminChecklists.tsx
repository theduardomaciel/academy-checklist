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
import type { AdminChecklistTemplate, ChecklistItem } from '../types'

interface TemplateWithItems extends AdminChecklistTemplate {
  checklist_items: ChecklistItem[]
}

const BADGE_WARNING =
  'inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning'

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
    <main className={APP_MAIN}>
      <p className={PAGE_TITLE}>Administração · Checklists</p>
      <p className={PAGE_SUBTITLE}>Configure os checklists disponíveis no app.</p>

      {error && <div className={FORM_ERROR}>{error}</div>}
      {notice && <div className={`${CARD} mb-3 border-success`}>{notice}</div>}

      <form className={`${CARD} mb-3 grid gap-3`} onSubmit={handleCreateTemplate}>
        <label className="grid gap-1">
          <span className={FIELD_LABEL}>Nome do checklist</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fechamento da sala X"
            required
            className={INPUT}
          />
        </label>
        <label className="grid gap-1">
          <span className={FIELD_LABEL}>Descrição</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            className={INPUT}
          />
        </label>
        <button className={BTN_PRIMARY_BLOCK} type="submit" disabled={creating}>
          {creating ? 'Criando…' : 'Criar checklist'}
        </button>
      </form>

      {loading ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner className="text-primary" />
        </div>
      ) : (
        templates.map((t) => (
          <div key={t.id} className={`${CARD} mb-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 mb-1 font-bold">
                  {t.name}{' '}
                  {!t.is_active && <span className={BADGE_WARNING}>Inativo</span>}
                </p>
                {t.description && (
                  <p className="m-0 text-[13px] text-text-muted">{t.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button className={BTN_SECONDARY} onClick={() => toggleActive(t)}>
                  {t.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button className={BTN_SECONDARY} onClick={() => deleteTemplate(t)}>
                  Excluir
                </button>
              </div>
            </div>

            <ol className="mb-0 mt-3 pl-5">
              {t.checklist_items.map((item) => (
                <li key={item.id} className="mb-1.5">
                  <span>{item.title}</span>
                  {item.requires_photo && (
                    <span className="inline-flex items-center rounded-full bg-border px-2.5 py-1 text-xs font-semibold text-text-muted">
                      {' '}
                      📷
                    </span>
                  )}
                  <button
                    className="ml-2 inline-flex cursor-pointer items-center bg-transparent p-2 px-2.5 text-inherit"
                    onClick={() => removeItem(t.id, item.id)}
                    title="Remover item"
                    aria-label={`Remover ${item.title}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>

            <button className={`${BTN_SECONDARY} mt-3`} onClick={() => addItem(t.id)}>
              Adicionar item
            </button>
          </div>
        ))
      )}

      <nav className={LIST_NAV}>
        <Link to="/" className={BTN_SECONDARY}>
          Voltar
        </Link>
        <Link to="/admin/usuarios" className={BTN_SECONDARY}>
          Gerenciar usuários
        </Link>
      </nav>
    </main>
  )
}
