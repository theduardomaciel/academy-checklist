import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	BottomNav,
	CenteredLoader,
	FormError,
	PageMain,
	PageSubtitle,
	PageTitle,
} from "@/components/page-shell";

interface HistoryRow {
	id: string;
	status: "in_progress" | "completed" | "cancelled";
	started_at: string;
	completed_at: string | null;
	checklist_templates: { name: string } | null;
	profiles: { full_name: string | null } | null;
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
	completed: {
		text: "Concluído",
		className: "bg-success-bg text-success",
	},
	in_progress: {
		text: "Em andamento",
		className: "bg-warning-bg text-warning",
	},
	cancelled: {
		text: "Cancelado",
		className: "bg-destructive text-white",
	},
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function History() {
	const { user, isAdmin } = useAuth();
	const navigate = useNavigate();
	const [sessions, setSessions] = useState<HistoryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	if (!user) {
		throw new Error("History requires an authenticated user");
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function load() {
		setLoading(true);
		const query = supabase
			.from("closing_sessions")
			.select(
				"id, status, started_at, completed_at, checklist_templates(name), profiles(full_name)",
			)
			.order("started_at", { ascending: false })
			.limit(50);

		if (!isAdmin) {
			query.eq("user_id", user!.id);
		}

		const { data, error: fetchError } = await query;

		if (fetchError) {
			setError("Não foi possível carregar o histórico.");
		} else {
			setSessions((data ?? []) as unknown as HistoryRow[]);
		}
		setLoading(false);
	}

	return (
		<PageMain>
			<PageTitle>Histórico</PageTitle>
			<PageSubtitle>
				{isAdmin
					? "Fechamentos de todos os usuários."
					: "Seus fechamentos anteriores."}
			</PageSubtitle>

			{error && <FormError>{error}</FormError>}

			{loading ? (
				<CenteredLoader />
			) : sessions.length === 0 ? (
				<Card>
					<CardContent className="items-center px-5 py-12 text-center text-muted-foreground">
						Nenhum fechamento registrado ainda.
					</CardContent>
				</Card>
			) : (
				sessions.map((s) => (
					<Link
						key={s.id}
						to={`/historico/${s.id}`}
						className="mb-3 block no-underline"
					>
						<Card className="shadow-sm transition-shadow hover:shadow-md">
							<CardContent className="flex-row items-center justify-between gap-3">
								<div>
									<p className="m-0 mb-1 font-bold">
										{s.checklist_templates?.name ??
											"Checklist"}
									</p>
									<p className="m-0 text-[13px] text-muted-foreground">
										{isAdmin && s.profiles?.full_name
											? `${s.profiles.full_name} · `
											: ""}
										{formatDate(s.started_at)}
									</p>
								</div>
								<Badge
									className={
										STATUS_LABEL[s.status]?.className
									}
								>
									{STATUS_LABEL[s.status]?.text ?? s.status}
								</Badge>
							</CardContent>
						</Card>
					</Link>
				))
			)}

			<BottomNav>
				<Button variant="outline" onClick={() => navigate("/")}>
					Voltar
				</Button>
			</BottomNav>
		</PageMain>
	);
}
