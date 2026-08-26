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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { USER_ROLES, type AdminUser } from "@/types";
import { ShieldMinus, ShieldPlus, Trash } from "lucide-react";

export default function AdminUsers() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);

	// New-user form state
	const [email, setEmail] = useState("");
	const [fullName, setFullName] = useState("");
	const [password, setPassword] = useState("");
	const [creating, setCreating] = useState(false);

	// Delete-user dialog state
	const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function load() {
		setLoading(true);
		const { data, error: rpcError } = await supabase.rpc("list_users");
		if (rpcError) {
			toast.error("Não foi possível carregar os usuários.");
		} else {
			setUsers((data ?? []) as unknown as AdminUser[]);
		}
		setLoading(false);
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();

		if (!email.trim() || password.length < 6) {
			toast.error(
				"Informe um e-mail válido e uma senha com pelo menos 6 caracteres.",
			);
			return;
		}

		setCreating(true);
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;
			if (!token)
				throw new Error("Sessão expirada. Faça login novamente.");

			const response = await fetch(
				`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						email: email.trim(),
						password,
						fullName: fullName.trim(),
					}),
				},
			);

			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					body.error ?? "Não foi possível criar o usuário.",
				);
			}

			setEmail("");
			setFullName("");
			setPassword("");
			toast.success(`Usuário ${email.trim()} criado com sucesso.`);
			await load();
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Erro inesperado ao criar o usuário.",
			);
		} finally {
			setCreating(false);
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;
			if (!token)
				throw new Error("Sessão expirada. Faça login novamente.");

			const response = await fetch(
				`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ uid: deleteTarget.id }),
				},
			);

			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					body.error ?? "Não foi possível excluir o usuário.",
				);
			}

			setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
			toast.success(
				`Usuário ${deleteTarget.email} excluído com sucesso.`,
			);
			setDeleteTarget(null);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Erro inesperado ao excluir o usuário.",
			);
		} finally {
			setDeleting(false);
		}
	}

	async function toggleAdmin(target: AdminUser) {
		const { error: rpcError } = await supabase.rpc("set_user_admin", {
			target_uid: target.id,
			admin_flag: !target.is_admin,
		});
		if (rpcError) {
			toast.error(rpcError.message);
			return;
		}
		setUsers((prev) =>
			prev.map((u) =>
				u.id === target.id ? { ...u, is_admin: !target.is_admin } : u,
			),
		);
		toast.success(
			`${target.full_name ?? target.email} ${target.is_admin ? "não é mais" : "agora é"} administrador.`,
		);
	}

	async function setUserRole(target: AdminUser, role: string | null) {
		const { error: rpcError } = await supabase.rpc("set_user_role", {
			target_uid: target.id,
			new_role: role,
		});
		if (rpcError) {
			toast.error(rpcError.message);
			return;
		}
		setUsers((prev) =>
			prev.map((u) => (u.id === target.id ? { ...u, role } : u)),
		);
		toast.success(
			`Cargo de ${target.full_name ?? target.email} atualizado.`,
		);
	}

	return (
		<PageMain>
			<PageTitle>Administração · Usuários</PageTitle>
			<PageSubtitle>
				Crie novos usuários e gerencie permissões de administrador.
			</PageSubtitle>

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
						<Button
							type="submit"
							className="w-full"
							disabled={creating}
						>
							{creating ? "Criando…" : "Criar usuário"}
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
								<p className="m-0 mb-1 font-bold">
									{u.full_name ?? u.email ?? "Usuário"}
								</p>
								<p className="m-0 text-[13px] text-muted-foreground">
									{u.email}
								</p>
							</div>
							<div className="flex flex-col items-end gap-2">
								<div className="flex items-center gap-2">
									{u.is_admin && (
										<Badge className="bg-success-bg text-success">
											Admin
										</Badge>
									)}
									{!u.is_admin && (
										<Button
											variant="outline"
											size="sm"
											className="text-destructive"
											onClick={() => setDeleteTarget(u)}
										>
											<Trash />
										</Button>
									)}
									<Button
										variant="outline"
										size="sm"
										onClick={() => toggleAdmin(u)}
									>
										{u.is_admin ? (
											<>
												<ShieldMinus /> Remover admin
											</>
										) : (
											<>
												<ShieldPlus /> Tornar admin
											</>
										)}
									</Button>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-[13px] text-muted-foreground">
										Cargo
									</span>
									<Select
										value={
											(u.role as string) ?? "Sem cargo"
										}
										onValueChange={(val: string | null) =>
											setUserRole(
												u,
												val === "Sem cargo" ||
													val === null
													? null
													: val,
											)
										}
									>
										<SelectTrigger
											size="sm"
											aria-label="Cargo"
										>
											<SelectValue placeholder="Cargo" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Sem cargo">
												Sem cargo
											</SelectItem>
											{USER_ROLES.map((role) => (
												<SelectItem
													key={role}
													value={role}
												>
													{role}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>
					</Card>
				))
			)}

			<AlertDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover usuário?</AlertDialogTitle>
						<AlertDialogDescription>
							O usuário {deleteTarget?.email ?? ""} será excluído
							permanentemente, junto com o seu perfil. Esta ação
							não pode ser desfeita.
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
								handleDelete();
							}}
						>
							{deleting ? "Excluindo…" : "Remover"}
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
					render={<Link to="/admin/checklists" />}
				>
					Gerenciar checklists
				</Button>
			</BottomNav>
		</PageMain>
	);
}
