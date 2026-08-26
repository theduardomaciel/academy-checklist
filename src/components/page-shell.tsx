import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

/** Standard page container: centered column with bottom padding for the nav bar. */
export function PageMain({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<main
			className={cn(
				"mx-auto w-full max-w-[640px] flex-1 px-4 pt-5 pb-24",
				className,
			)}
		>
			{children}
		</main>
	);
}

export function PageTitle({ children }: { children: ReactNode }) {
	return <p className="m-0 mb-1 text-[22px] font-extrabold">{children}</p>;
}

export function PageSubtitle({ children }: { children: ReactNode }) {
	return (
		<p className="mt-0 mb-5 text-sm text-muted-foreground">{children}</p>
	);
}

/** Error banner shown above content. */
export function FormError({ children }: { children: ReactNode }) {
	return (
		<div
			role="alert"
			className="mb-3.5 rounded-md bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
		>
			{children}
		</div>
	);
}

/** Success/info banner shown above content. */
export function Notice({ children }: { children: ReactNode }) {
	return (
		<div className="mb-3 rounded-lg border border-success bg-success-bg px-4 py-3 text-sm text-success">
			{children}
		</div>
	);
}

export function FormField({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor?: string;
	children: ReactNode;
}) {
	return (
		<div className="">
			<label
				htmlFor={htmlFor}
				className="mb-3 block text-[13px] font-semibold text-muted-foreground"
			>
				{label}
			</label>
			{children}
		</div>
	);
}

/** Fixed bottom navigation bar (mobile-style). */
export function BottomNav({ children }: { children: ReactNode }) {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center gap-2 border-t bg-card px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
			{children}
		</nav>
	);
}

/** Full-height centered spinner, used while data loads. */
export function CenteredLoader() {
	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Spinner className="text-primary" />
		</div>
	);
}
