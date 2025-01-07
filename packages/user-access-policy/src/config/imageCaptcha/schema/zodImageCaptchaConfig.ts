import {number, object} from "zod";

const zodImageCaptchaConfig = object({
    solvedCount: number().optional(),
    unsolvedCount: number().optional(),
});

export default zodImageCaptchaConfig;
