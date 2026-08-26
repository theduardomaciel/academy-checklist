import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
	DndContext,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Camera, Edit, MapPin, Power, PowerOff, Trash } from "lucide-react";
import { cn } from "#lib/utils";

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
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
	const [savingItem, setSavingItem] = useState(false);

	const [editingTemplate, setEditingTemplate] =
		useState<TemplateWithItems | null>(null);
	const [templateForm, setTemplateForm] = useState({
		name: "",
		description: "",
	});
	const [savingTemplate, setSavingTemplate] = useState(false);

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
			console.error("load:", templatesResult.error.message);
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
			console.error("handleCreateTemplate:", insertError.message);
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
			console.error("toggleActive:", updateError.message);
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
			console.error("handleDeleteTemplate:", deleteError.message);
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

		if (editingItemId) {
			const { error: updateError } = await supabase
				.from("checklist_items")
				.update({
					title: itemForm.title.trim(),
					location: itemForm.location.trim() || null,
					instructions: itemForm.instructions.trim() || null,
					requires_photo: itemForm.requiresPhoto,
				})
				.eq("id", editingItemId);

			if (updateError) {
				console.error("handleAddItem (update):", updateError.message);
				toast.error("Não foi possível salvar o item.");
			} else {
				setTemplates((prev) =>
					prev.map((t) =>
						t.id === itemTemplateId
							? {
									...t,
									checklist_items: t.checklist_items.map(
										(i) =>
											i.id === editingItemId
												? {
														...i,
														title: itemForm.title.trim(),
														location:
															itemForm.location.trim() ||
															null,
														instructions:
															itemForm.instructions.trim() ||
															null,
														requires_photo:
															itemForm.requiresPhoto,
													}
												: i,
									),
								}
							: t,
					),
				);
				toast.success("Item atualizado.");
				closeItemDialog();
			}
			setSavingItem(false);
			return;
		}

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
			console.error("handleAddItem:", insertError.message);
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
			console.error("removeItem:", deleteError.message);
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

	async function handleReorder(templateId: string, from: number, to: number) {
		const template = templates.find((t) => t.id === templateId);
		if (!template || from === to) return;

		const reordered = arrayMove(template.checklist_items, from, to);
		const withOrder = reordered.map((item, i) => ({
			...item,
			order_index: i + 1,
		}));

		setTemplates((prev) =>
			prev.map((t) =>
				t.id === templateId ? { ...t, checklist_items: withOrder } : t,
			),
		);

		const updates = withOrder.map((item, i) => ({
			id: item.id,
			order_index: i + 1,
		}));

		const results = await Promise.all(
			updates.map((u) =>
				supabase
					.from("checklist_items")
					.update({ order_index: u.order_index })
					.eq("id", u.id),
			),
		);
		const updateError = results.find((r) => r.error)?.error ?? null;

		if (updateError) {
			console.error("handleReorder:", updateError.message);
			toast.error("Não foi possível salvar a nova ordem.");
			load();
			return;
		}
		toast.success("Ordem atualizada.");
	}

	function closeItemDialog() {
		setItemTemplateId(null);
		setEditingItemId(null);
		setItemForm(emptyItemForm);
	}

	function openEditItemDialog(templateId: string, item: ChecklistItem) {
		setItemTemplateId(templateId);
		setEditingItemId(item.id);
		setItemForm({
			title: item.title,
			location: item.location ?? "",
			instructions: item.instructions ?? "",
			requiresPhoto: item.requires_photo,
		});
	}

	async function handleSaveTemplate(e: React.FormEvent) {
		e.preventDefault();
		if (!editingTemplate || !templateForm.name.trim()) return;

		setSavingTemplate(true);
		const { error: updateError } = await supabase
			.from("checklist_templates")
			.update({
				name: templateForm.name.trim(),
				description: templateForm.description.trim() || null,
			})
			.eq("id", editingTemplate.id);

		if (updateError) {
			console.error("handleSaveTemplate:", updateError.message);
			toast.error("Não foi possível salvar o checklist.");
		} else {
			setTemplates((prev) =>
				prev.map((t) =>
					t.id === editingTemplate.id
						? {
								...t,
								name: templateForm.name.trim(),
								description:
									templateForm.description.trim() || null,
							}
						: t,
				),
			);
			toast.success("Checklist atualizado.");
			setEditingTemplate(null);
		}
		setSavingTemplate(false);
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
						<CardContent className="gap-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
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
										onClick={() => {
											setEditingTemplate(t);
											setTemplateForm({
												name: t.name,
												description:
													t.description ?? "",
											});
										}}
									>
										<Edit />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => toggleActive(t)}
									>
										{t.is_active ? <Power /> : <PowerOff />}
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => setDeleteTarget(t)}
									>
										<Trash />
									</Button>
								</div>
							</div>

							<TemplateItems
								template={t}
								onReorder={handleReorder}
								onRemoveItem={(itemId) =>
									removeItem(t.id, itemId)
								}
								onEditItem={(item) =>
									openEditItemDialog(t.id, item)
								}
							/>

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
						<DialogTitle>
							{editingItemId ? "Editar item" : "Adicionar item"}
						</DialogTitle>
						<DialogDescription>
							{
								templates.find((t) => t.id === itemTemplateId)
									?.name
							}
						</DialogDescription>
					</DialogHeader>
					<form className="grid gap-4" onSubmit={handleAddItem}>
						<FormField
							label={
								editingItemId
									? "Título do item"
									: `Título do item ${nextOrderFor(itemTemplateId, templates)}`
							}
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
								{savingItem
									? editingItemId
										? "Salvando…"
										: "Adicionando…"
									: editingItemId
										? "Salvar"
										: "Adicionar item"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={editingTemplate !== null}
				onOpenChange={(open) => !open && setEditingTemplate(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar checklist</DialogTitle>
						<DialogDescription>
							Altere o nome e a descrição do checklist.
						</DialogDescription>
					</DialogHeader>
					<form className="grid gap-4" onSubmit={handleSaveTemplate}>
						<FormField label="Nome do checklist">
							<Input
								type="text"
								value={templateForm.name}
								onChange={(e) =>
									setTemplateForm((f) => ({
										...f,
										name: e.target.value,
									}))
								}
								placeholder="Fechamento da sala X"
								autoFocus
								required
							/>
						</FormField>
						<FormField label="Descrição">
							<Input
								type="text"
								value={templateForm.description}
								onChange={(e) =>
									setTemplateForm((f) => ({
										...f,
										description: e.target.value,
									}))
								}
								placeholder="Opcional"
							/>
						</FormField>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditingTemplate(null)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={savingTemplate}>
								{savingTemplate ? "Salvando…" : "Salvar"}
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
							O checklist &quot;{deleteTarget?.name}&quot; e todos
							os seus itens serão excluídos permanentemente. Esta
							ação não pode ser desfeita.
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

function TemplateItems({
	template,
	onReorder,
	onRemoveItem,
	onEditItem,
}: {
	template: TemplateWithItems;
	onReorder: (templateId: string, from: number, to: number) => void;
	onRemoveItem: (itemId: string) => void;
	onEditItem: (item: ChecklistItem) => void;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const from = template.checklist_items.findIndex(
			(i) => i.id === active.id,
		);
		const to = template.checklist_items.findIndex((i) => i.id === over.id);
		if (from < 0 || to < 0) return;
		onReorder(template.id, from, to);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={template.checklist_items.map((i) => i.id)}
				strategy={verticalListSortingStrategy}
			>
				<ol className="m-0">
					{template.checklist_items.map((item) => (
						<SortableRow
							key={item.id}
							item={item}
							onDelete={() => onRemoveItem(item.id)}
							onEdit={() => onEditItem(item)}
						/>
					))}
				</ol>
			</SortableContext>
		</DndContext>
	);
}

function SortableRow({
	item,
	onDelete,
	onEdit,
}: {
	item: ChecklistItem;
	onDelete: () => void;
	onEdit: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	return (
		<li
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				zIndex: isDragging ? 10 : undefined,
				position: isDragging ? "relative" : undefined,
			}}
			className={cn(
				`not-last:mb-1.5 gap-4 flex flex-wrap items-center rounded-md border p-4 border-muted`,
				{
					"bg-muted opacity-80": isDragging,
				},
			)}
		>
			<div className="flex flex-row w-full items-center gap-4">
				<button
					type="button"
					className="cursor-grab touch-none bg-transparent px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
					title="Arraste para reordenar"
					aria-label={`Reordenar ${item.title}`}
					{...attributes}
					{...listeners}
				>
					⠿
				</button>
				<div className="flex-1 flex flex-col min-w-0 gap-2">
					{item.title}
					<div className="flex flex-row flex-wrap items-center justify-start gap-2">
						{item.location && (
							<Badge variant="outline" className="max-w-full">
								<MapPin />{" "}
								<span className="truncate">
									{item.location}
								</span>
							</Badge>
						)}
						{item.requires_photo && (
							<Badge variant="outline">
								<Camera />{" "}
								<span className="truncate">Foto</span>
							</Badge>
						)}
					</div>
				</div>
			</div>
			<button
				type="button"
				className="md:ml-1 cursor-pointer bg-transparent p-1 text-muted-foreground hover:text-foreground"
				title="Editar item"
				aria-label={`Editar ${item.title}`}
				onClick={onEdit}
			>
				✎ <span className="md:hidden">Editar</span>
			</button>
			<button
				type="button"
				className="ml-1 cursor-pointer bg-transparent p-1 text-muted-foreground hover:text-destructive"
				title="Remover item"
				aria-label={`Remover ${item.title}`}
				onClick={onDelete}
			>
				✕ <span className="md:hidden">Remover</span>
			</button>
		</li>
	);
}
