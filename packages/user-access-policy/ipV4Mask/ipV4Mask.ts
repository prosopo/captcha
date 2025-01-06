interface UserIpV4Mask {
	rangeMinAsNumeric: bigint;
	rangeMaxAsNumeric: bigint;
	// CIDR prefix https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing - 198.51.100.14/{24}
	// for presentation only purposes
	asNumeric: number;
}

export default UserIpV4Mask;
