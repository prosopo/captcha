import { bigint, object, string } from "zod";
import zodIpV4Mask from "./mask/zodIpV4Mask.js";

const zodIpV4 = object({
	asNumeric: bigint(),
	asString: string(),
	mask: zodIpV4Mask.optional(),
});

export default zodIpV4;
