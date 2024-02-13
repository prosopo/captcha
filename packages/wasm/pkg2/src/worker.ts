import { createSHA256 } from "hash-wasm";

export type Solution = {
    nonce: Uint8Array,
    input: Uint8Array,
    hash: Uint8Array,
    difficulty: number,
    start: number,
    step: number,
    iters: number,
    timeMs: number
}

export type Message = {
    input: Uint8Array,
    difficulty: number,
    start: number,
    step: number,
    command: 'hash'
}

export type Event = {
    data: Message
}

export const exec = async (e: Event): Promise<Solution> => {
    return new Promise<Solution>(async (resolve, reject) => {
        const startTime = Date.now();
        // other code can send messages to this worker, so protect against invalid messages
        if (e.data.command !== 'hash') {
            console.log(`unknown event: ${JSON.stringify(e)}`)
            return;
        }
        // difficulty is the number of bytes == 0 at the start of the hash
        const difficulty = e.data.difficulty;
        const start = e.data.start;
        if (start < 0) {
            throw new Error('start must be greater than 0');
        }
        const step = e.data.step
        if (step < 1) {
            throw new Error('step must be greater than 0');
        }
        if (step > Math.pow(2, 32)) {
            throw new Error('step must be less than 2^32');
        }
        const input = e.data.input;
        // check if input is a Uint8Array
        if (!(input instanceof Uint8Array)) {
            throw new Error('input must be a Uint8Array');
        }
        const bytes = new Uint8Array([...new Uint8Array(new Uint32Array([0]).buffer), ...input]);
        const hasher = await createSHA256();
        const limit = Math.pow(2, 32);
        const target = new Uint8Array(difficulty);
        for (let i = start, j = 0; i < limit; i += step, j++) {
            // else try again, incrementing the last uint32 by start. start is used as a step size to avostart collisions with other workers
            new Uint8Array(new Uint32Array([i]).buffer).forEach((el, j) => bytes[j] = el)
            // clear the hasher's input buffer
            await hasher.init();
            // update the hasher's input buffer with the new bytes
            await hasher.update(bytes);
            // hash the input buffer, converting uint8array to uint32array
            const hash = await hasher.digest('binary');
            // check if the hash meets the difficulty
            // if the first n bytes are 0, then the hash meets the difficulty
            const slice = hash.slice(0, difficulty)
            // console.log(bytes, hash, slice, target, i)
            let found = true;
            for (let k = 0; k < difficulty; k++) {
                if (slice[k] !== target[k]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                const endTime = Date.now();
                const solution: Solution = {
                    nonce: bytes.slice(0, 4),
                    input,
                    hash: hash,
                    difficulty: difficulty,
                    start: start,
                    step: step,
                    iters: j,
                    timeMs: endTime - startTime
                }
                // found a solution
                self.postMessage(solution);
                resolve(solution)
                return;
            }
            // if (j == 1000000) {
            //     console.log('end')
            //     return;
            // }
        }
    })
}

self.addEventListener('message', 
exec);
