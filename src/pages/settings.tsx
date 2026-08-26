import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/auth-context";
import { useTheme, type Theme } from "@/contexts/theme-context";
import {
	BottomNav,
	FormError,
	FormField,
	PageMain,
	PageSubtitle,
	PageTitle,
} from "@/components/page-shell";
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
import { Spinner } from "@/components/spinner";
import { USER_ROLES } from "@/types";

const THEME_OPTIONS = [
	{ value: "system", label: "Sistema", icon: Monitor },
	{ value: "light", label: "Claro", icon: Sun },
	{ value: "dark", label: "Escuro", icon: Moon },
] as const;

export default function Settings() {
	  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme();
	const navigate = useNavigate();

	async function handleSignOut() {
		await signOut();
		navigate("/login");
	}

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		if (!user) return;
		supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single()
			.then(({ data }) => setRole(data?.role ?? null));
	}, [user]);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");

		if (newPassword.length < 6) {
			setError("A nova senha deve ter pelo menos 6 caracteres.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("A confirmação não corresponde à nova senha.");
			return;
		}

		setSaving(true);
		try {
			if (!user?.email) throw new Error("Usuário sem e-mail associado.");

			// Re-authenticate with the current password before changing it.
			const { error: signInError } =
				await supabase.auth.signInWithPassword({
					email: user.email,
					password: currentPassword,
				});
			if (signInError) {
				throw new Error("Senha atual incorreta.");
			}

			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});
			if (updateError) {
				throw new Error(updateError.message);
			}

			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.success("Senha alterada com sucesso.");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Erro ao alterar a senha.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<PageMain>
			<PageTitle>Perfil</PageTitle>
			<PageSubtitle>Gerencie seu acesso ao sistema.</PageSubtitle>

			<Card className="mb-3">
				<CardContent className="gap-1">
					<p className="m-0 text-[13px] text-muted-foreground">
						Cargo
					</p>
					<p className="m-0 font-bold">
						{role &&
						USER_ROLES.includes(role as (typeof USER_ROLES)[number])
							? role
							: "Não definido"}
					</p>
				</CardContent>
			</Card>

			<Card className="mb-3">
				<CardContent className="gap-3">
					<FormField label="Aparência">
						<Select
							value={theme}
							onValueChange={(val: string | null) =>
								setTheme((val ?? "system") as Theme)
							}
						>
							<SelectTrigger aria-label="Aparência">
								<SelectValue placeholder="Aparência">
									{(value) => {
										const opt = THEME_OPTIONS.find((o) => o.value === value);
										if (!opt) return "Aparência";
										const Icon = opt.icon;
										return (
											<span className="flex items-center gap-2">
												<Icon className="size-4" />
												{opt.label}
											</span>
										);
									}}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{THEME_OPTIONS.map((o) => {
									const Icon = o.icon;
									return (
										<SelectItem key={o.value} value={o.value}>
											<Icon className="size-4" />
											{o.label}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</FormField>
				</CardContent>
			</Card>

			<form onSubmit={handleSubmit}>
				<Card>
					<CardContent className="gap-3">
						<FormField label="Senha atual">
							<Input
								type="password"
								value={currentPassword}
								onChange={(e) =>
									setCurrentPassword(e.target.value)
								}
								required
							/>
						</FormField>
						<FormField label="Nova senha">
							<Input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
							/>
						</FormField>
						<FormField label="Confirmar nova senha">
							<Input
								type="password"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								required
							/>
						</FormField>
						{error && <FormError>{error}</FormError>}
						<Button
							type="submit"
							className="w-full"
							disabled={saving}
						>
							{saving ? <Spinner /> : "Alterar senha"}
						</Button>
					</CardContent>
				</Card>
			</form>

			<BottomNav>
				<Button variant="outline" render={<Link to="/" />}>
					Voltar
				</Button>
				<Button variant="outline" onClick={handleSignOut}>
					Sair
				</Button>
			</BottomNav>
		</PageMain>
	);
}
