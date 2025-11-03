import ReactDOM from "react-dom/client";
import { IntegrationDemoComponent } from "./integrationDemo.js";

class App {
	public render(): void {
		const rootElement = document.querySelector("#root");

		if (rootElement) {
			this.renderProcaptcha(rootElement);
			return;
		}

		throw new Error("root element is not found");
	}

	protected renderProcaptcha(rootElement: Element): void {
		const reactRoot = ReactDOM.createRoot(rootElement);

		reactRoot.render(<IntegrationDemoComponent />);
	}
}

export { App };
