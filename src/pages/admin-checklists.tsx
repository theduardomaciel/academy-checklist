import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import {
	BottomNav,
	CenteredLoader,
	FormField,
	PageMain,
	PageSubtitle,
	PageTitle,
} from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminChecklistTemplate, ChecklistItem } from "@/types";

interface TemplateWithItems extends AdminChecklistTemplate {
	checklist_items: ChecklistItem[];
}

interface ItemFormState {
	title: string;
	location: string;
	instructions: string;
	requiresPhoto: boolean;
}

const emptyItemForm: ItemFormState = {
	title: "",
	location: "",
	instructions: "",
	requiresPhoto: false,
};

export default function AdminChecklists() {
	const [templates, setTemplates] = useState<TemplateWithItems[]>([]);
	const [loading, setLoading] = useState(true);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [creating, setCreating] = useState(false);

	const [itemTemplateId, setItemTemplateId] = useState<string | null>(null);
	const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
	const [savingItem, setSavingItem] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<TemplateWithItems | null>(
		null,
	);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function load() {
		setLoading(true);
		const templatesResult = await supabase
			.from("checklist_templates")
			.select("*, checklist_items(*)")
			.order("created_at", { ascending: true })
			.order("order_index", {
				ascending: true,
				foreignTable: "checklist_items",
			});

		if (templatesResult.error) {
			toast.error("Não foi possível carregar os checklists.");
		} else {
			setTemplates(
				(templatesResult.data ?? []) as unknown as TemplateWithItems[],
			);
		}
		setLoading(false);
	}

	async function handleCreateTemplate(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setCreating(true);
		const { data, error: insertError } = await supabase
			.from("checklist_templates")
			.insert({
				name: name.trim(),
				description: description.trim() || null,
			})
			.select()
			.single();

		if (insertError) {
			toast.error("Não foi possível criar o checklist.");
		} else {
			const template = data as AdminChecklistTemplate;
			setTemplates((prev) => [
				...prev,
				{ ...template, checklist_items: [] },
			]);
			setName("");
			setDescription("");
			toast.success(
				`Checklist "${template.name}" criado. Adicione os itens abaixo.`,
			);
		}
		setCreating(false);
	}

	async function toggleActive(template: TemplateWithItems) {
		const { error: updateError } = await supabase
			.from("checklist_templates")
			.update({ is_active: !template.is_active })
			.eq("id", template.id);

		if (updateError) {
			toast.error("Não foi possível atualizar o checklist.");
			return;
		}
		setTemplates((prev) =>
			prev.map((t) =>
				t.id === template.id
					? { ...t, is_active: !template.is_active }
					: t,
			),
		);
		toast.success(
			`Checklist "${template.name}" ${template.is_active ? "desativado" : "ativado"}.`,
		);
	}

	async function handleDeleteTemplate() {
		if (!deleteTarget) return;

		setDeleting(true);
		const { error: deleteError } = await supabase
			.from("checklist_templates")
			.delete()
			.eq("id", deleteTarget.id);

		if (deleteError) {
			console.error(deleteError.message);
			toast.error("Não foi possível excluir o checklist.");
		} else {
			setTemplates((prev) =>
				prev.filter((t) => t.id !== deleteTarget.id),
			);
			toast.success(`Checklist "${deleteTarget.name}" excluído.`);
			setDeleteTarget(null);
		}
		setDeleting(false);
	}

	async function handleAddItem(e: React.FormEvent) {
		e.preventDefault();
		if (!itemTemplateId || !itemForm.title.trim()) return;

		const template = templates.find((t) => t.id === itemTemplateId);
		if (!template) return;

		setSavingItem(true);
		const nextOrder = template.checklist_items.length + 1;
		const { data, error: insertError } = await supabase
			.from("checklist_items")
			.insert({
				template_id: itemTemplateId,
				order_index: nextOrder,
				title: itemForm.title.trim(),
				location: itemForm.location.trim() || null,
				instructions: itemForm.instructions.trim() || null,
				requires_photo: itemForm.requiresPhoto,
			})
			.select()
			.single();

		if (insertError) {
			toast.error("Não foi possível adicionar o item.");
		} else {
			setTemplates((prev) =>
				prev.map((t) =>
					t.id === itemTemplateId
						? {
								...t,
								checklist_items: [
									...t.checklist_items,
									data as ChecklistItem,
								],
							}
						: t,
				),
			);
			toast.success("Item adicionado.");
			closeItemDialog();
		}
		setSavingItem(false);
	}

	async function removeItem(templateId: string, itemId: string) {
		const { error: deleteError } = await supabase
			.from("checklist_items")
			.delete()
			.eq("id", itemId);

		if (deleteError) {
			toast.error("Não foi possível remover o item.");
			return;
		}
		setTemplates((prev) =>
			prev.map((t) =>
				t.id === templateId
					? {
							...t,
							checklist_items: t.checklist_items.filter(
								(i) => i.id !== itemId,
							),
						}
					: t,
			),
		);
		toast.success("Item removido.");
	}

	function closeItemDialog() {
		setItemTemplateId(null);
		setItemForm(emptyItemForm);
	}

	return (
		<PageMain>
			<PageTitle>Administração · Checklists</PageTitle>
			<PageSubtitle>
				Configure os checklists disponíveis no app.
			</PageSubtitle>

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
						<Button
							type="submit"
							className="w-full"
							disabled={creating}
						>
							{creating ? "Criando…" : "Criar checklist"}
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
										{!t.is_active && (
											<Badge className="bg-warning-bg text-warning">
												Inativo
											</Badge>
										)}
									</p>
									{t.description && (
										<CardDescription>
											{t.description}
										</CardDescription>
									)}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => toggleActive(t)}
									>
										{t.is_active ? "Desativar" : "Ativar"}
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => setDeleteTarget(t)}
									>
										Excluir
									</Button>
								</div>
							</div>

							<ol className="m-0">
								{t.checklist_items.map((item) => (
									<li key={item.id} className="mb-1.5">
										<span>{item.title}</span>
										{item.location && (
											<Badge
												variant="outline"
												className="ml-2"
											>
												📍 {item.location}
											</Badge>
										)}
										{item.requires_photo && (
											<Badge
												variant="outline"
												className="ml-2"
											>
												📷 Foto
											</Badge>
										)}
										<button
											className="ml-1 cursor-pointer bg-transparent p-1 text-muted-foreground hover:text-destructive"
											onClick={() =>
												removeItem(t.id, item.id)
											}
											title="Remover item"
											aria-label={`Remover ${item.title}`}
										>
											✕
										</button>
									</li>
								))}
							</ol>

							<div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setItemTemplateId(t.id)}
								>
									Adicionar item
								</Button>
							</div>
						</CardContent>
					</Card>
				))
			)}

			<Dialog
				open={itemTemplateId !== null}
				onOpenChange={(open) => !open && closeItemDialog()}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Adicionar item</DialogTitle>
						<DialogDescription>
							{
								templates.find((t) => t.id === itemTemplateId)
									?.name
							}
						</DialogDescription>
					</DialogHeader>
					<form className="grid gap-4" onSubmit={handleAddItem}>
						<FormField
							label={`Título do item ${nextOrderFor(itemTemplateId, templates)}`}
						>
							<Input
								type="text"
								value={itemForm.title}
								onChange={(e) =>
									setItemForm((f) => ({
										...f,
										title: e.target.value,
									}))
								}
								placeholder="Ex.: Desligar computadores"
								autoFocus
								required
							/>
						</FormField>
						<FormField label="Local (opcional)">
							<Input
								type="text"
								value={itemForm.location}
								onChange={(e) =>
									setItemForm((f) => ({
										...f,
										location: e.target.value,
									}))
								}
								placeholder="Ex.: Sala 2 — bancada esquerda"
							/>
						</FormField>
						<FormField label="Instruções (opcional)">
							<Textarea
								value={itemForm.instructions}
								onChange={(e) =>
									setItemForm((f) => ({
										...f,
										instructions: e.target.value,
									}))
								}
								placeholder="Detalhe como executar a tarefa…"
								rows={3}
							/>
						</FormField>
						<div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
							<Label htmlFor="item-requires-photo">
								Este item exige foto?
							</Label>
							<Switch
								id="item-requires-photo"
								checked={itemForm.requiresPhoto}
								onCheckedChange={(checked) =>
									setItemForm((f) => ({
										...f,
										requiresPhoto: checked,
									}))
								}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={closeItemDialog}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={savingItem}>
								{savingItem ? "Adicionando…" : "Adicionar item"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir checklist?</AlertDialogTitle>
						<AlertDialogDescription>
							O checklist "{deleteTarget?.name}" e todos os seus
							itens serão excluídos permanentemente. Esta ação não
							pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deleting}
							onClick={(e) => {
								e.preventDefault();
								handleDeleteTemplate();
							}}
						>
							{deleting ? "Excluindo…" : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<BottomNav>
				<Button variant="outline" render={<Link to="/" />}>
					Voltar
				</Button>
				<Button
					variant="outline"
					render={<Link to="/admin/usuarios" />}
				>
					Gerenciar usuários
				</Button>
			</BottomNav>
		</PageMain>
	);
}

function nextOrderFor(
	templateId: string | null,
	templates: TemplateWithItems[],
): number | undefined {
	const template = templates.find((t) => t.id === templateId);
	return template ? template.checklist_items.length + 1 : undefined;
}
