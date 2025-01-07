import {object, string} from "zod";
import zodIpV6Mask from "./mask/zodIpV6Mask.js";

const zodIpV6 = object({
    asNumericString: string(),
    asString: string(),
    mask: zodIpV6Mask.optional(),
});

export default zodIpV6;
