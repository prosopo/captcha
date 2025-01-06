import type Ip from "../../../ip/ip.js";

interface DeleteRuleFilters {
	clientId?: string;
	userIp?: Ip;
	userId?: string;
}

export default DeleteRuleFilters;
