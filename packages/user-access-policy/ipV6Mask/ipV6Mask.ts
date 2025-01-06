interface UserIpV6Mask {
    rangeMinAsNumericString: string;
    rangeMaxAsNumericString: string;
    // CIDR prefix https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing - 2001:db8:abcd:0012:ffff:ffff:ffff:ffff/{128}
    // for presentation only purposes
    asNumeric: number;
}

export default UserIpV6Mask;