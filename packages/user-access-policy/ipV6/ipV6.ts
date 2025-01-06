import type IpV6Mask from "../ipV6Mask/ipV6Mask.js";

interface IpV6 {
    asNumericString: string;
    // for presentation only purposes
    asString: string;
    mask?: IpV6Mask;
}

export default IpV6;