import { mount } from "svelte";
import IntegrationDemo from "./integrationDemo.svelte";

const root = document.getElementById("root");

if (root instanceof HTMLElement) {
	mount(IntegrationDemo, {
		target: root,
	});
} else {
	throw new Error("root element not found");
}
