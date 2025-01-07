import {object} from "zod";
import zodIpV4 from "./v4/zodIpV4.js";
import zodIpV6 from "./v6/zodIpV6.js";

const zodIp = object({
    v4: zodIpV4.optional(),
    v6: zodIpV6.optional(),
});

export default zodIp;
