import type {Address4, Address6} from "ip-address";

interface SearchRuleFilters {
    userIpAddress?: Address4 | Address6;
    userId?: string;
    clientId?: string;
}

export default SearchRuleFilters;
