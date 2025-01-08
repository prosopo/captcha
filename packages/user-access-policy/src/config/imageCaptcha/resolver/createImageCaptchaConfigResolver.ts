import type CaptchaConfigResolver from "./captchaConfigResolver.js";
import ImageCaptchaConfigResolver from "./imageCaptchaConfigResolver.js";

export default function (): CaptchaConfigResolver {
	return new ImageCaptchaConfigResolver();
}
