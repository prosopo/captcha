


import WebWorker from 'web-worker:./worker.ts';
import { Message2 } from './worker';

const run = async () => {
    let count = 5
    const limit = 20
    const throughputs: number[] = []
    let benchmarks: number[][] = []
    let workers: Worker[] = []
    const reportInterval = 1000
    for (let n = 1; n <= limit; n++) {
        const workerBenchmarks: number[] = []
        benchmarks.push(workerBenchmarks)
        // setup a new worker
        const worker = new WebWorker()
        worker.addEventListener('message', function (e) {
            workerBenchmarks.push(e.data)
            if (workerBenchmarks.length > count) {
                workerBenchmarks.shift()
            }
        });
        workers.push(worker)
        worker.postMessage({ command: 'hash' });
        // wait for workers to do some work
        await new Promise<void>((resolve, reject) => setTimeout(resolve, reportInterval * (count + 1)))
        // collect benchmarks
        const total = benchmarks.reduce((acc, cur) => acc + cur.reduce((acc, cur) => acc + cur, 0), 0)
        const throughput = total / 1000000000
        throughputs.push(throughput)
        console.log(`throughput: ${throughput}`)
    }
    console.log('terminating workers')
    for (const worker of workers) {
        worker.terminate()
    }
    console.log(throughputs.map((x, i) => `${i + 1} ${x}`).join('\n'))
}

window.addEventListener('DOMContentLoaded', run)