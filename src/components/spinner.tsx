import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className = "" }: { className?: string }) {
	return (
		<LoaderCircle
			aria-label="Carregando"
			className={cn("size-4.5 animate-spin", className)}
		/>
	);
}
