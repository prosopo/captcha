// Store original NODE_TLS_REJECT_UNAUTHORIZED value
const originalTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

// Custom fetch wrapper that temporarily disables TLS verification for self-signed certs
export const testFetch = async (
	url: string,
	options?: RequestInit,
): Promise<Response> => {
	// For HTTPS requests in tests, disable certificate verification
	if (url.startsWith("https://")) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		try {
			return await fetch(url, options);
		} finally {
			// Restore original value
			if (originalTlsReject !== undefined) {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
			} else {
				delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
			}
		}
	}
	return fetch(url, options);
};
