import type Ip from "../ip/ip.js";
import type Config from "../config/config.js";

interface Rule {
    isUserBlocked: boolean;
    clientId?: string;
    description?: string;
    userIp?: Ip;
    userId?: string;
    config?: Config;
}

export default Rule;
