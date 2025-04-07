import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["cjs"],
			fileName: "index",
		},
		outDir: "dist/cjs",
		emptyOutDir: false,
	},
}); 