


import WebWorker from 'web-worker:./worker.ts';
import { Message2, Report2 } from './worker';

const run = async () => {
    const workers: Worker[] = []
    let bestThroughput = 0

    while (true) {
        const index = workers.length
        console.log(`adding worker ${index}`)
        // add a new worker
        const worker = new WebWorker()
        workers.push(worker)
        // start the worker
        const msg: Message2 = { command: 'hash' }
        worker.postMessage(msg)
        const throughput = await new Promise<number>((resolve, reject) => {
            // ask all workers to report their throughput
            const startProgresses: number[] = Array(workers.length).fill(0)
            const endProgresses: number[] = Array(workers.length).fill(0)
            const reportCounts: number[] = Array(workers.length).fill(0)
            const startTimes: number[] = Array(workers.length).fill(0)
            const endTimes: number[] = Array(workers.length).fill(0)
            for (let i = 0; i < workers.length; i++) {
                const worker = workers[i]
                function listener(e: {data: Report2}) {
                    reportCounts[i]++
                    if (reportCounts[i] === 1) {
                        // first report, set start time
                        startTimes[i] = Date.now()
                        startProgresses[i] = e.data.count
                    } else if (reportCounts[i] === 2) {
                        // second report, set end time
                        endTimes[i] = Date.now()
                        endProgresses[i] = e.data.count
                        // remove the listener as we have the report
                        worker.removeEventListener('message', listener)
                        console.log(`worker ${i} progress: ${endProgresses[i] - startProgresses[i]}`)
                        // if every worker has reported
                        if (reportCounts.every((r) => r === 2)) {
                            // calculate the total throughput
                            // throughput is the difference in progress between the start and end times
                            const total = startProgresses.map((t, i) => Math.max(0, endProgresses[i] - t) / Math.max(1, endTimes[i] - startTimes[i])).reduce((a, b) => a + b, 0)
                            resolve(total)
                        }
                    }
                }
                worker.addEventListener('message', listener)
            }
        })
        if (throughput > bestThroughput) {
            console.log(`new best throughput: ${throughput} (was ${bestThroughput})`)
            // adding worker helped
            // continue adding workers
            bestThroughput = throughput
        } else {
            console.log(`throughput: ${throughput} (was ${bestThroughput})`)
            // did not help
            // remove last worker and stop
            // workers.pop().terminate()
            // // sleep for a while and try again
            // await new Promise<void>((resolve, reject) => {
            //     setTimeout(() => {
            //         resolve()
            //     }, 1000)
            // })
            workers.forEach((worker) => worker.terminate())
            break;
        }
    }

    // while (true) {
    //     // sleep for a small amount of time to get work done in background
    //     await new Promise<void>((resolve, reject) => {
    //         setTimeout(() => {
    //             resolve()
    //         }, 100)
    //     })
    //     const throughput = await new Promise<number>((resolve, reject) => {
    //         let throughput = 0
    //         let count = 0
    //         const listener = (e: MessageEvent) => {
    //             console.log('message', e.data)
    //             throughput += e.data
    //             count++
    //             if (count === workers.length) {
    //                 console.log('throughput', throughput)
    //                 resolve(throughput)
    //                 // todo remove listeners
    //             }
    //         }
    //         for (const worker of workers) {
    //             worker.addEventListener('message', listener)
    //         }
    //         for (const worker of workers) {
    //             worker.postMessage({ command: 'report' } as Message2)
    //         }
    //     })
    //     if (throughput > bestThroughput) {
    //         console.log(`new best throughput: ${throughput} (was ${bestThroughput})`)
    //         // adding worker helped
    //         // continue adding workers
    //         bestThroughput = throughput
    //     } else {
    //         console.log(`throughput: ${throughput} (was ${bestThroughput})`)
    //         // did not help
    //         // remove last worker and stop
    //         workers.pop().terminate()
    //         // sleep for a while and try again
    //         await new Promise<void>((resolve, reject) => {
    //             setTimeout(() => {
    //                 resolve()
    //             }, 1000)
    //         })
    //     }
    // }
}

window.addEventListener('DOMContentLoaded', run)