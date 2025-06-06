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
import type { NextFunction, Request, Response } from "express";

export function robotsMiddleware() {
	return (_req: Request, res: Response, next: NextFunction) => {
		res.setHeader("Strict-Transport-Security", "max-age=31536000;");
		res.setHeader("X-XSS-Protection", "1; mode=block");
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader("X-Robots-Tag", "none");
		next();
	};
}
