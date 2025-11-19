// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import express, { type Router } from "express";
import { z } from "zod";

// Request schema for page protect validation
const PageProtectValidateRequestSchema = z.object({
	token: z.string(),
	splashPageSrc: z.string(),
});

type PageProtectValidateRequest = z.infer<typeof PageProtectValidateRequestSchema>;

// Response types
interface PageProtectSuccessResponse {
	success: true;
	message: string;
	redirectUrl?: string;
}

interface PageProtectErrorResponse {
	success: false;
	message: string;
	requiresAction?: boolean;
}

type PageProtectResponse = PageProtectSuccessResponse | PageProtectErrorResponse;

/**
 * Returns a router for page protection endpoints
 *
 * @return {Router} - A middleware router for page protection
 */
export function pageProtectRouter(): Router {
	const router = express.Router();

	/**
	 * POST /page-protect/validate
	 * Validates a page protection request with 50/50 chance of success/failure
	 */
	router.post('/page-protect/validate', async (req, res, next) => {
		try {
			// Parse and validate request body
			const validationResult = PageProtectValidateRequestSchema.safeParse(req.body);
			
			if (!validationResult.success) {
				req.logger.error(() => ({
					err: validationResult.error,
					data: { reqBody: req.body },
					msg: "Invalid page protect validation request",
				}));
				return res.status(400).json({
					success: false,
					message: "Invalid request format",
					errors: validationResult.error.errors,
				} as PageProtectErrorResponse);
			}

			const { token, splashPageSrc } = validationResult.data;

			// Log the request for debugging
			req.logger.info(() => ({
				data: { token: token.substring(0, 10) + '...', splashPageSrc },
				msg: "Page protect validation request received",
			}));

			// 50/50 chance of returning success vs 400 error
			const shouldSucceed = Math.random() > 0.5;

			if (shouldSucceed) {
				// Happy path - return success
				const successResponse: PageProtectSuccessResponse = {
					success: true,
					message: "Page protection validation successful",
					redirectUrl: splashPageSrc,
				};
				
				req.logger.info(() => ({
					data: { token: token.substring(0, 10) + '...' },
					msg: "Page protect validation succeeded",
				}));

				return res.status(200).json(successResponse);
			} else {
				// 400 error path
				const errorResponse: PageProtectErrorResponse = {
					success: false,
					message: "Page protection validation failed",
					requiresAction: true,
				};

				req.logger.warn(() => ({
					data: { token: token.substring(0, 10) + '...' },
					msg: "Page protect validation failed (random 50/50)",
				}));

				return res.status(400).json(errorResponse);
			}

		} catch (err) {
			req.logger.error(() => ({
				err,
				data: { reqParams: req.params, reqBody: req.body },
				msg: "Error processing page protect validation",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 500 },
				}),
			);
		}
	});

	// Error handler should be at the end
	router.use(handleErrors);

	return router;
}

export type {
	PageProtectValidateRequest,
	PageProtectResponse,
	PageProtectSuccessResponse,
	PageProtectErrorResponse,
};
