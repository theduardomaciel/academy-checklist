import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export type { Theme, ResolvedTheme };

interface ThemeContextValue {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	toggleTheme: () => void;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "edge-academy-theme";

function getSystemTheme(): ResolvedTheme {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function getInitialTheme(): Theme {
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system")
		return stored;
	return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);
	const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

	// Keep track of the OS preference so "system" updates live.
	useEffect(() => {
		const mql = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () =>
			setSystemTheme(mql.matches ? "dark" : "light");
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	const resolvedTheme: ResolvedTheme =
		theme === "system" ? systemTheme : theme;

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", resolvedTheme);
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme, resolvedTheme]);

	const toggleTheme = () =>
		setTheme((t) => (t === "dark" || t === "system" ? "light" : "dark"));

	return (
		<ThemeContext.Provider
			value={{ theme, resolvedTheme, toggleTheme, setTheme }}
		>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
