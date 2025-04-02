import { Component, inject, ElementRef, Input } from "@angular/core";
import {
	type ProcaptchaOptions,
	procaptchaWrapper,
} from "@prosopo/procaptcha-wrapper";

@Component({
	selector: "procaptcha-component",
	imports: [],
	template: "<div></div>",
	styles: "",
})
export class ProcaptchaComponent {
	elementRef = inject(ElementRef);

	@Input({ required: true })
	settings!: ProcaptchaOptions;
	@Input()
	htmlAttributes: { [key: string]: string } = {};

	public ngOnInit(): void {
		this.render();
	}

	private render(): void {
		for (const attr in this.htmlAttributes) {
			this.elementRef.nativeElement.setAttribute(
				attr,
				this.htmlAttributes[attr],
			);
		}

		procaptchaWrapper.renderProcaptcha(
			this.elementRef.nativeElement,
			this.settings,
		);
	}
}
