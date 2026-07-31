// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import type http from "node:http";
import stream from "node:stream";
import dotenv from "dotenv";
import express, {
	type Express,
	type Request,
	type RequestHandler,
	type Response as ExpressResponse,
} from "express";
import sharp from "sharp";

/** Port used when PROSOPO_FILE_SERVER_PORT is unset. */
export const DEFAULT_PORT = 3000;

/** Resolved configuration for a file server instance. */
export interface FileServerEnv {
	port: string | number;
	paths: string[];
	resize: number | undefined;
	remotes: string[];
	logLevel: string;
}

/** Console-shaped output sink, injected so tests can capture output. */
export interface Logger {
	info: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	error: (...args: unknown[]) => void;
}

/**
 * Fetches a remote URL. Injected so tests need no network.
 *
 * Note this is the global fetch Response, not express's same-named Response.
 */
export type FetchFn = (url: string) => Promise<globalThis.Response>;

/** Resizes an image buffer to a square of `size` pixels. */
export type ResizeFn = (image: Buffer, size: number) => Promise<Buffer>;

/** Collaborators of the request handler. */
export interface FileServerDeps {
	logger: Logger;
	fetch: FetchFn;
	resize: ResizeFn;
}

/** Production resize, backed by sharp. */
export const sharpResize: ResizeFn = (
	image: Buffer,
	size: number,
): Promise<Buffer> =>
	sharp(image).resize({ width: size, height: size, fit: "fill" }).toBuffer();

/**
 * Parse an env var that should hold a JSON array of strings.
 *
 * Anything that is not a JSON array of strings — including unparseable text —
 * is treated as a single literal entry, so a bare path like `/srv/img` works
 * as well as `["/srv/img"]`.
 */
export const parseArray = (value: string): string[] => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return [value];
	}
	if (
		Array.isArray(parsed) &&
		parsed.every((entry: unknown) => typeof entry === "string")
	) {
		return parsed;
	}
	return [value];
};

/** Parse an integer env var, yielding undefined for anything unparseable. */
export const toInt = (
	value: string | number | undefined,
): number | undefined => {
	if (typeof value === "number") {
		return value;
	}
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number.parseInt(value);
	return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Read configuration from the environment, loading the matching .env first.
 *
 * The .env load is skipped when a caller supplies its own `env`: dotenv writes
 * into `process.env` and cannot populate an arbitrary object, so loading it
 * would mutate global state without affecting a single value read below.
 */
export const getEnv = (env: NodeJS.ProcessEnv = process.env): FileServerEnv => {
	if (env === process.env) {
		const path = env.NODE_ENV ? `.env.${env.NODE_ENV}` : ".env";
		dotenv.config({ path });
	}
	return {
		port: env.PROSOPO_FILE_SERVER_PORT || DEFAULT_PORT,
		paths: parseArray(env.PROSOPO_FILE_SERVER_PATHS || "[]"),
		// the size to resize images to, undefined means no resize
		resize: toInt(env.PROSOPO_FILE_SERVER_RESIZE) || undefined,
		// the remote servers to proxy to
		remotes: parseArray(env.PROSOPO_FILE_SERVER_REMOTES || "[]"),
		logLevel: env.PROSOPO_LOG_LEVEL || "info",
	};
};

/**
 * Handler for anything not served from the local filesystem: try each remote in
 * order, streaming back the first hit, and 404 if none of them have it.
 *
 * Each remote is attempted independently — a failing or slow remote is logged
 * and skipped rather than failing the request.
 */
export const createRemoteHandler = (
	env: FileServerEnv,
	deps: FileServerDeps,
): RequestHandler => {
	return async (req: Request, res: ExpressResponse): Promise<void> => {
		for (const remote of env.remotes) {
			deps.logger.info("trying", remote, req.url);
			let img: Buffer;
			try {
				const result = await deps.fetch(`${remote}${req.url}`);
				if (result.status !== 200) {
					deps.logger.warn("not found", remote, req.url, result.status);
					continue;
				}
				deps.logger.info("found", remote, req.url);
				const imgTmp = await result.arrayBuffer();
				img = Buffer.from(imgTmp);
			} catch (error) {
				deps.logger.warn("error", remote, req.url, error);
				continue;
			}
			if (env.resize) {
				deps.logger.info("resizing", remote, req.url, env.resize);
				try {
					img = await deps.resize(img, env.resize);
				} catch (error) {
					// A non-image, or a corrupt one, must not take the request down:
					// express 4 does not catch rejections from async handlers, so an
					// unguarded throw here would leave the client hanging.
					deps.logger.warn("resize failed", remote, req.url, error);
					continue;
				}
			}
			stream.Readable.from(img).pipe(res);
			return;
		}
		// could not find file in any remote
		res.status(404).send("Not found");
	};
};

/** Build the express app: static paths first, then the remote fallback. */
export const createApp = (
	env: FileServerEnv,
	deps: FileServerDeps,
): Express => {
	const app = express();

	for (const loc of env.paths) {
		// allow local filesystem lookup at each location
		// http://localhost:3000/a.jpg
		// serve path set to /
		// url: pronode1.duckdns.org/img/a.jpg
		// serve path set to /img
		// url: pronode1.duckdns.org/a.jpg`
		app.use("/", express.static(loc));
		deps.logger.info(`Serving files from ${loc}`);
	}

	app.get("*", createRemoteHandler(env, deps));

	return app;
};

/** Default collaborators: the real console, global fetch and sharp. */
export const defaultDeps = (): FileServerDeps => ({
	logger: console,
	fetch: (url: string): Promise<globalThis.Response> => fetch(url),
	resize: sharpResize,
});

/**
 * Build the app from the environment and start listening. Returns the server so
 * callers (and tests) can shut it down.
 */
export const main = async (
	deps: FileServerDeps = defaultDeps(),
): Promise<http.Server> => {
	const env = getEnv();
	const app = createApp(env, deps);
	return app.listen(env.port, () => {
		deps.logger.info(`File server running on port ${env.port}`);
	});
};
