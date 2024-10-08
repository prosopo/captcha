// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { spawn } from "node:child_process";

export type ExecOpts = {
	// NOTE: don't use these for getting the output. These are meant for streaming the output of a long running process.
	stdoutLogger?: (line: string) => void;
	stderrLogger?: (line: string) => void;
	cmdLogger?: (line: string) => void; // whether to print the command being executed before executing it
};

export type ExecResult = {
	cmd: string;
	stdout: string;
	stderr: string;
};

export type ExecFailed = {
	exitCode: number;
	signal?: string;
} & ExecResult;

export const exec = (cmd: string, opts?: ExecOpts): Promise<ExecResult> => {
	return new Promise((resolve, reject: (reason: ExecFailed) => void) => {
		opts?.cmdLogger?.(`exec: '${cmd}'`);

		// spawn allows streaming the output of the command so we don't have to wait
		const child = spawn(cmd, {
			shell: true,
		});

		let stdout = Buffer.from("");
		let stderr = Buffer.from("");

		const handleBuffer = (buffer: Buffer, data: Buffer) => {
			// a buffer holds some binary data
			// we need to add the new data to the buffer
			buffer = Buffer.concat([buffer, data]);
			// the buffer may contain incomplete output, e.g. half a line of text
			// we can handle all lines except the last one, as this one may be incomplete
			const lines = buffer.toString().split("\n");
			const lastLine = lines.pop() || "";
			// keep the last line in the buffer
			buffer = Buffer.from(lastLine);
			return {
				buffer,
				lines,
			};
		};

		child.stdout.on("data", (data) => {
			let lines = [] as string[];
			({ buffer: stdout, lines } = handleBuffer(stdout, data));
			for (const line of lines) {
				opts?.stdoutLogger?.(line);
			}
		});

		child.stderr.on("data", (data) => {
			let lines = [] as string[];
			({ buffer: stderr, lines } = handleBuffer(stderr, data));
			for (const line of lines) {
				opts?.stdoutLogger?.(line);
			}
		});

		child.on("exit", (exitCode, signal) => {
			if (exitCode !== 0 || signal) {
				reject({
					cmd,
					stdout: stdout.toString(),
					stderr: stderr.toString(),
					exitCode: exitCode || 1,
					signal: signal || undefined,
				});
			} else {
				resolve({
					cmd,
					stdout: stdout.toString(),
					stderr: stderr.toString(),
				});
			}
		});
	});
};
