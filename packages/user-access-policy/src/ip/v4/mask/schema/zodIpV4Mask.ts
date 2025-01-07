import { bigint, number, object } from "zod";

const zodIpV4Mask = object({
	rangeMinAsNumeric: bigint(),
	rangeMaxAsNumeric: bigint(),
	asNumeric: number(),
});

export default zodIpV4Mask;
