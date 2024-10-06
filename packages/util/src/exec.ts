import { spawn } from "node:child_process";

export const exec = (cmd: string, opts?: {
	// NOTE: don't use these for getting the output. These are just for logging purposes!
	stdoutLog?: (data: string) => void, // stream the data for stdout
	stderrLog?: (data: string) => void, // stream the data for stderr
}): Promise<{
	cmd: string;
	stdout: string;
	stderr: string;
}> => {
	return new Promise((resolve, reject) => {
		// spawn allows streaming the output of the command so we don't have to wait

		const child = spawn(cmd, {
			shell: true,
		});

		const stdout: string[] = [];
		const stderr: string[] = [];

		child.stdout.on("data", (data) => {
			stdout.push(data.toString());
			opts?.stdoutLog?.(data.toString());
		})

		child.stderr.on("data", (data) => {
			stderr.push(data.toString());
			opts?.stderrLog?.(data.toString());
		})

		child.on("exit", (exitCode, signal) => {
			if(exitCode !== 0 || signal) {
				reject({
					cmd,
					stdout: stdout.join(""),
					stderr: stderr.join(""),
					exitCode,
					signal,
				})
			} else {
				resolve({
					cmd,
					stdout: stdout.join(""),
					stderr: stderr.join(""),
				})
			}
		})
	})

}
