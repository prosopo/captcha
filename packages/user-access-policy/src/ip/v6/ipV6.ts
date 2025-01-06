import type IpV6Mask from "./mask/ipV6Mask.js";

interface IpV6 {
    asNumericString: string;
    // for presentation only purposes
    asString: string;
    mask?: IpV6Mask;
}

export default IpV6;