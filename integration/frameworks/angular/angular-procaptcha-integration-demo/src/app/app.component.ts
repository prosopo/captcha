import { Component } from "@angular/core";
import { ProcaptchaComponent } from "@prosopo/angular-procaptcha-wrapper";
import { environment } from "../environments/environment";

@Component({
	selector: "app-root",
	imports: [ProcaptchaComponent],
	template: `<procaptcha-component [settings]="{siteKey:procaptchaSiteKey}"
                        [htmlAttributes]="{class:'my-app__procaptcha'}"/>`,
	styles: "",
})
export class AppComponent {
	procaptchaSiteKey = environment.PROCATCHA_SITE_KEY;
}
