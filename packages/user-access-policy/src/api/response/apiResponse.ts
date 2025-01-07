import type ApiResponseStatus from "./apiResponseStatus.js";

interface ApiResponse {
	status: ApiResponseStatus;
	error?: string;
	data?: object;
}

export default ApiResponse;
