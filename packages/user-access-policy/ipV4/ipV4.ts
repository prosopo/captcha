import type IpV4Mask from "../ipV4Mask/ipV4Mask.js";

interface IpV4 {
	asNumeric: bigint;
	// for presentation only purposes
	asString: string;
	mask?: IpV4Mask;
}

export default IpV4;
