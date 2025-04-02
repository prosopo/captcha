import { Component } from "@angular/core";
import { ProcaptchaComponent } from "@prosopo/angular-procaptcha-wrapper";

@Component({
	selector: "app-root",
	imports: [ProcaptchaComponent],
	template: `<procaptcha-component [settings]="{siteKey:procaptchaSiteKey}"
                        [htmlAttributes]="{class:'my-app__procaptcha'}"/>`,
	styles: "",
})
export class AppComponent {
	procaptchaSiteKey = "mySiteKey"; // todo pickup from '.env'
}
