import { defineConfig } from "vite";
import { ViteTestConfig } from "@prosopo/config";
import {aliases} from "./aliases.js";

export default defineConfig({
	...ViteTestConfig,
	resolve: {
		alias: aliases,
	},
});
