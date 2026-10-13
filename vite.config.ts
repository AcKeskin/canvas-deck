import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	root: "dev/harness",
	plugins: [react()],
	define: { "process.env.IS_PREACT": JSON.stringify("false") },
	server: { port: 5199, strictPort: true },
	build: { outDir: "../dist" },
});
