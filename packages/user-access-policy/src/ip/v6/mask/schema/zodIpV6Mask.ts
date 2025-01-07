import { number, object, string } from "zod";

const zodIpV6Mask = object({
	rangeMinAsNumericString: string(),
	rangeMaxAsNumericString: string(),
	asNumeric: number(),
});

export default zodIpV6Mask;
