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
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
    <PageMain>
      <PageTitle>Administração · Checklists</PageTitle>
      <PageSubtitle>Configure os checklists disponíveis no app.</PageSubtitle>

      {error && <FormError>{error}</FormError>}
      {notice && <Notice>{notice}</Notice>}

      <form className="mb-3" onSubmit={handleCreateTemplate}>
        <Card>
          <CardContent className="gap-3">
            <FormField label="Nome do checklist">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fechamento da sala X"
                required
              />
            </FormField>
            <FormField label="Descrição">
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? 'Criando…' : 'Criar checklist'}
            </Button>
          </CardContent>
        </Card>
      </form>

      {loading ? (
        <CenteredLoader />
      ) : (
        templates.map((t) => (
          <Card key={t.id} className="mb-3 shadow-sm">
            <CardContent className="gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 mb-1 flex items-center gap-2 font-bold">
                    {t.name}
                    {!t.is_active && <Badge className="bg-warning-bg text-warning">Inativo</Badge>}
                  </p>
                  {t.description && <CardDescription>{t.description}</CardDescription>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(t)}>
                    {t.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteTemplate(t)}>
                    Excluir
                  </Button>
                </div>
              </div>

              <ol className="m-0 pl-5">
                {t.checklist_items.map((item) => (
                  <li key={item.id} className="mb-1.5">
                    <span>{item.title}</span>
                    {item.requires_photo && (
                      <Badge variant="outline" className="ml-2">
                        📷 Foto
                      </Badge>
                    )}
                    <button
                      className="ml-1 cursor-pointer bg-transparent p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(t.id, item.id)}
                      title="Remover item"
                      aria-label={`Remover ${item.title}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>

              <div>
                <Button variant="outline" size="sm" onClick={() => addItem(t.id)}>
                  Adicionar item
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
        <Button variant="outline" render={<Link to="/admin/usuarios" />}>
          Gerenciar usuários
        </Button>
      </BottomNav>
    </PageMain>
  )
}
