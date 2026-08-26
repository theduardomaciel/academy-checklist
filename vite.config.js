import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
// https://vitejs.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["logo-blue.svg", "logo-white.svg"],
			manifest: {
				name: "Edge Academy - Fechamento do Espaço",
				short_name: "Fechamento",
				description:
					"Checklist de fechamento do espaço do Edge Academy",
				theme_color: "#173c6c",
				background_color: "#173c6c",
				display: "standalone",
				start_url: "/",
				icons: [
					{
						src: "logo-blue.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any",
					},
				],
			},
			workbox: {
				// Never cache Supabase API/storage calls — data must always be fresh.
				runtimeCaching: [
					{
						urlPattern: ({ url }) =>
							url.origin.includes("supabase.co"),
						handler: "NetworkOnly",
					},
				],
			},
		}),
	],
	server: {
		port: 5173,
	},
});
