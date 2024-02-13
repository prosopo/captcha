
// const blobUrl = URL.createObjectURL(new Blob(['(',
//     function() {
//         self.addEventListener('message', function (e) {
//             // make the worker busy-wait for a set time
//             var start = Date.now();
//             var end = start + 4;
//             var i = Date.now();
//             while (i < end) {
//                 i = Date.now();
//             };
//             self.postMessage({start, end});
//         });
//     }.toString(),
//     ')()'], { type: 'application/javascript' }));

// const sample = async (n: number): Promise<number> => {
//     if (n <= 0) {
//         return Promise.reject(new Error('n must be greater than 0'));
//     }
//     if (n === 1) {
//         return Promise.resolve(1);
//     }
//     return new Promise((resolve, reject) => {

//         const workers: Worker[] = [];
//         const results: {
//             start: number;
//             end: number;
//             id: number;
//         }[] = []
//         for (let i = 0; i < n; i++) {
//             // kick off n workers
//             const worker = new Worker(blobUrl);
//             worker.addEventListener('message', function (e) {
//                 results.push({ ...e.data, id: i });
//                 // when all workers have completed
//                 if (results.length === n) {
//                     // terminate all workers
//                     workers.forEach(worker => worker.terminate());
//                     console.log(results);
//                     // reduce values
//                     const start = results.reduce((acc, curr) => Math.min(acc, curr.start), Infinity);
//                     // deduct start from all start and end values
//                     for (const result of results) {
//                         result.start -= start;
//                         result.end -= start;
//                     }
//                     // count overlaps
//                     let overlaps = results.map(() => 0);
//                     let j = 0
//                     for (const result of results) {
//                         let count = 0
//                         for (const other of results) {
//                             if (result.id !== other.id) {
//                                 if (result.start < other.end && result.end > other.start) {
//                                     count++;
//                                 }
//                             }
//                         }
//                         overlaps[result.id] = count;
//                         j++
//                     }
//                     console.log(overlaps)
//                     let maxOverlap = overlaps.reduce((acc, curr) => Math.max(acc, curr), 0) + 1;
//                     resolve(maxOverlap);
//                 }
//             });
//             workers.push(worker);
//         }
//         workers.forEach((worker, i) => worker.postMessage(i));
//     });
// }

// const estimate = async (): Promise<void> => {
//     for (let i = 1; i <= 20; i++) {
//         const nThreads = await sample(i)
//         console.log(`nThreads: ${nThreads}`);
//     }
// }

// export const run = () => {
//     estimate();
// }

// import { sha256 } from 'hash-wasm';
// import { createSHA256 } from 'hash-wasm';

// const blobUrl = URL.createObjectURL(new Blob([
//     "import { createSHA256 } from 'hash-wasm';",
//     "(",
//     function () {
//         self.addEventListener('message', async (e): Promise<void> => {
//             // TODO make e type-safe
//             console.log(e.data)
//             // difficulty is the number of bytes == 0 at the start of the hash
//             const difficulty = e.data.difficulty;
//             const id = e.data.id;
//             if (id <= 0) {
//                 throw new Error('id must be greater than 0');
//             }
//             const input = e.data.input;
//             const bytes = new Uint8Array([...input, id]);
//             const hasher = await createSHA256();
//             const limit = Math.pow(2, 32);
//             const target = new Uint8Array(difficulty);
//             for (let i = 0; i < limit; i++) {
//                 // clear the hasher's input buffer
//                 await hasher.init();
//                 // update the hasher's input buffer with the new bytes
//                 await hasher.update(bytes);
//                 // hash the input buffer, converting uint8array to uint32array
//                 const hash = await hasher.digest('binary');
//                 // check if the hash meets the difficulty
//                 // if the last n uint32s are 0, then the hash meets the difficulty
//                 if (hash.slice(0, difficulty) === target) {
//                     // found a solution
//                     self.postMessage(bytes);
//                     return;
//                 }
//                 // else try again, incrementing the last uint32 by id. Id is used as a step size to avoid collisions with other workers
//                 bytes[bytes.length - 1] = id * i;
//             }
//         });
//     }.toString(),
// ')()'], { type: 'application/javascript' }));


import WebWorker from 'web-worker:./worker.ts';
import { Message, exec } from './worker';
import { sha256 } from '@noble/hashes/sha256';
import { createSHA256, sha256 as hwSha256 } from "hash-wasm";
import { run as wasmRun, run2 as wasmRun2 } from './wasm';
import init from './wasm';

const single = (difficulty: number): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
        const worker = new WebWorker()
        const bytes = new Uint8Array(new Uint32Array([0,1,2,3,4,5,6,7]).buffer);
        worker.addEventListener('message', function (e) {
            // console.log(e.data);
            worker.terminate();
            resolve(e.data.timeMs);
        });
        const message: Message = { input: bytes, difficulty, start: 0, step: 1, command: 'hash' }
        worker.postMessage(message);
    })
}

const sample = async (difficulty: number) => {
    let timeSum = 0;
    const count = 30;
    for (let i = 0; i < count; i++) {
        timeSum += await single(difficulty);
    }
    return timeSum / count;
}


export const solvePoW = (data: Uint8Array, difficulty: number): number => {
    let nonce = 0
    const start = Date.now()
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const nonceBytes = new Uint8Array(new Uint32Array([nonce]).buffer)
        const message = new Uint8Array([...data, ...nonceBytes])
        const hashHex = sha256(message)

        let found = true
        for (let i = 0; i < difficulty; i++) {
            if (hashHex[i] !== 0) {
                found = false
                break;
            }
        }
        if (found) {
            break
        }

        nonce += 1

        // if (nonce % 1000000 === 0) {
        //     console.log(nonce)
        // }
    }
    return Date.now() - start
}

const bufferToHex = (buffer: Uint8Array): string =>
    Array.from(buffer)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')

const getArr = (n: number, el: number): Uint8Array => {
    const arr = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
        arr[i] = el
    }
    return arr

}

const benchNoble =  async (count: number, len: number) => {
    const start = Date.now()
    let result = 0
    for (let i = 0; i < count; i++) {   
        const r = sha256(getArr(len, i))
        result += r[0]
    }
    return {
        time: Date.now() - start,
        result
    }
}

const benchHashWasm = async (count: number, len: number) => {
    const start = Date.now()
    let result = 0
    for (let i = 0; i < count; i++) {
        const hex = bufferToHex(getArr(len, i))
        const r = await hwSha256(hex)
        result += r.charCodeAt(0)
    }
    return {
        time: Date.now() - start,
        result
    }
}

const benchHashWasm2 = async (count: number, len: number) => {
    const start = Date.now()
    let result = 0
    for (let i = 0; i < count; i++) {   
        const hasher = await createSHA256()
        hasher.update(getArr(len, i))
        const r = await hasher.digest('binary')
        result += r[0]
    }
    return {
        time: Date.now() - start,
        result
    }
}

const benchWasm = async (count: number, len: number) => {
    const start = Date.now()
    let result = 0
    for (let i = 0; i < count; i++) {   
        const r = wasmRun(getArr(len, i), 3)
        result += r
    }
    return {
        time: Date.now() - start,
        result
    }
}

const benchWasm2 = async (count: number, len: number) => {
    const start = Date.now()
    const result = wasmRun2(count, len)
    return {
        time: Date.now() - start,
        result
    }
}

const run = async () => {
    const count = 10_000_000
    const len = 128
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('run')
    await init()
    console.log('wasm', await benchWasm(count, len))
    console.log('wasm2', await benchWasm2(count, len))
    // console.log('wasm', wasmRun(new Uint8Array(new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer), 3))
    // console.log('wasm', wasmRun(new Uint8Array(new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer), 2))

    console.log('noble', await benchNoble(count, len))
    console.log('hash-wasm', await benchHashWasm(count, len))
    // console.log('hash-wasm2', await benchHashWasm2(count, len))

    // console.log('js small', solvePoW(new Uint8Array([0]), 3))
    // console.log('js', solvePoW(new Uint8Array(new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer), 3))
    // console.log('hash-wasm', await exec({
    //     data: {
    //         input: new Uint8Array(new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer),
    //         difficulty: 3,
    //         start: 0,
    //         step: 1,
    //         command: 'hash'
    //     },
    // }))
    // console.log('warmup', await single(1))
    // console.log('warmup', await single(2))
    // console.log('hash-wasm webworker', await single(3))
    // console.log('warmup', await single(4))
    // console.log('warmup', await single(5))
    // for (let i = 0; i < 10; i++) {
    //     const timeSum = await sample(i);
    //     console.log(`Difficulty: ${i}, Avg time taken: ${timeSum}ms`)
    // }
}

window.addEventListener('DOMContentLoaded', run)