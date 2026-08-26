import { Link, useNavigate } from "react-router-dom";
import { Settings, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export default function Header() {
	const { isAdmin } = useAuth();
	const navigate = useNavigate();

	return (
		<header className="sticky top-0 z-10 flex flex-wrap gap-2 items-center justify-between bg-card px-5 py-3.5 shadow-sm">
			<Link
				to="/"
				className="flex items-center justify-center gap-4 no-underline"
			>
				<img
					src="/logo-blue.svg"
					alt="Edge Academy"
					className="h-10 w-auto dark:hidden"
				/>
				<img
					src="/logo-white.svg"
					alt="Edge Academy"
					className="h-10 w-auto hidden dark:block"
				/>
				<span className="text-[15px] leading-[1.15] font-bold tracking-[0.2px]">
					Fechamento do Espaço
					<span className="block text-[11px] font-normal opacity-75">
						Edge Academy
					</span>
				</span>
			</Link>
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon-sm"
					className="text-inherit hover:bg-white/15 hover:text-inherit"
					onClick={() => navigate("/configuracoes")}
					title="Perfil"
					aria-label="Perfil"
				>
					<UserRound />
				</Button>
				{isAdmin && (
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-inherit hover:bg-white/15 hover:text-inherit"
						onClick={() => navigate("/admin/usuarios")}
						title="Administração"
						aria-label="Administração"
					>
						<Settings />
					</Button>
				)}
				{/* <ThemeToggle /> */}
			</div>
		</header>
	);
}
