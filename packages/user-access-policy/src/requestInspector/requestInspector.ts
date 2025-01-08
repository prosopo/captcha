import type { Address4, Address6 } from "ip-address";

interface RequestInspector {
	shouldAbortRequest(
		ipAddress: Address4 | Address6,
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): Promise<boolean>;
}

export default RequestInspector;
