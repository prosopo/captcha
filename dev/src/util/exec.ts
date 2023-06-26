import { spawn } from "child_process";
import { stdout, stderr, stdin } from 'process';

export interface ExecOutput {
    stdout: string;
    stderr: string;
    code: number | null;
}

export const exec = (command: string, options?: {
    pipe?: boolean,
    printCmd?: boolean,
}): Promise<ExecOutput> => {

    let { pipe, printCmd } = options || {};
    pipe = pipe === undefined || pipe; // map undefined to true
    printCmd = printCmd === undefined || printCmd; // map undefined to true

    if(printCmd) {
        console.log(`[exec] ${command}`)
    }

    const prc = spawn(command, {
        shell: true,
    });

    if(pipe || pipe === undefined) {
        prc.stdout.pipe(process.stdout);
        prc.stderr.pipe(process.stderr);
    }
    stdin.pipe(prc.stdin);

    const stdoutData: string[] = [];
    const stderrData: string[] = [];
    prc.stdout.on('data', (data) => {
        stdoutData.push(data.toString());
    })
    prc.stderr.on('data', (data) => {
        stderrData.push(data.toString());
    })

    return new Promise((resolve, reject) => {
        prc.on('close', function (code) {
            if(pipe || pipe === undefined) {
                console.log("")
            }
            const output: ExecOutput  = {
                stdout: stdoutData.join(''),
                stderr: stderrData.join(''),
                code,
            };
            if (code === 0) {
                resolve(output);
            } else {
                reject(output);
            }
        });
    });
}
