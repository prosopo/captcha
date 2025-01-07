import {object} from "zod";
import zodImageCaptchaConfig from "./imageCaptcha/zodImageCaptchaConfig.js";

const zodConfig = object({
    imageCaptcha: zodImageCaptchaConfig.optional(),
});

export default zodConfig;
