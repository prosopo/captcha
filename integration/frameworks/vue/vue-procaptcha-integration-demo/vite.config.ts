import { createIntegrationViteConfig } from "@prosopo/procaptcha-integration-build-config";
import vue from "@vitejs/plugin-vue";

export default createIntegrationViteConfig({
	name: "VueProcaptchaIntegrationDemo",
	directory: __dirname,
	viteSettings: {
		plugins: [vue()],
	},
});
