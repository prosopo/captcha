import { nativeEnum } from "zod";

export enum CaptchaType {
	image = "image",
	pow = "pow",
}

export const CaptchaTypeSpec = nativeEnum(CaptchaType);
