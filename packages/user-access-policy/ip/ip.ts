import type IpV4 from "../ipV4/ipV4.js";
import type IpV6 from "../ipV6/ipV6.js";

interface Ip {
	v4?: IpV4;
	v6?: IpV6;
}

export default Ip;
