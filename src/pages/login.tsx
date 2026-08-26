import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import ThemeToggle from "@/components/theme-toggle";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	FormError,
	FormField,
	PageSubtitle,
	PageTitle,
} from "@/components/page-shell";

export default function Login() {
	const { signInWithPassword, resetPasswordForEmail } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setInfo("");
		setLoading(true);
		const { error: signInError } = await signInWithPassword(
			email.trim(),
			password,
		);
		setLoading(false);
		if (signInError) {
			setError("E-mail ou senha inválidos.");
			return;
		}
		navigate("/");
	}

	async function handleForgotPassword() {
		if (!email.trim()) {
			setError(
				"Digite seu e-mail acima para receber o link de redefinição.",
			);
			return;
		}
		setError("");
		const { error: resetError } = await resetPasswordForEmail(email.trim());
		if (resetError) {
			setError("Não foi possível enviar o link. Tente novamente.");
		} else {
			setInfo("Link de redefinição enviado para o seu e-mail.");
		}
	}

	return (
		<div className="relative flex flex-1 flex-col items-center justify-center p-6">
			<div className="absolute right-4 top-4">
				<ThemeToggle />
			</div>

			<div className="mb-7 text-center">
				<img
					src="/logo-blue.svg"
					alt="Edge Academy"
					className="h-14 w-auto dark:hidden"
				/>
				<img
					src="/logo-white.svg"
					alt="Edge Academy"
					className="h-14 w-auto hidden dark:block"
				/>
			</div>

			<form onSubmit={handleSubmit} className="w-full max-w-[360px]">
				<Card>
					<CardContent>
						<PageTitle>Fechamento do Espaço</PageTitle>
						<PageSubtitle>
							Entre com o e-mail cadastrado pela Edge Academy.
						</PageSubtitle>

						{error && <FormError>{error}</FormError>}
						{info && (
							<div className="mb-3.5 rounded-md bg-success-bg px-3 py-2.5 text-[13px] text-success">
								{info}
							</div>
						)}

						<FormField label="E-mail" htmlFor="email">
							<Input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="voce@edgeacademy.com"
							/>
						</FormField>

						<FormField label="Senha" htmlFor="password">
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
							/>
						</FormField>

						<Button
							type="submit"
							className="mt-2 w-full"
							disabled={loading}
						>
							{loading ? <Spinner /> : "Entrar"}
						</Button>

						<button
							type="button"
							className="mt-2 w-full cursor-pointer bg-transparent p-2 text-[13px] text-inherit"
							onClick={handleForgotPassword}
						>
							Esqueci minha senha
						</button>
					</CardContent>
				</Card>
			</form>

			<p className="mt-5 text-xs text-center mx-6 text-muted-foreground">
				Não tem uma conta? Peça a um responsável pela gerência do
				Academy para criá-la.
			</p>
		</div>
	);
}
