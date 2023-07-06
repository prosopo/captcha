import cliProgress from 'cli-progress'

const foo = () => {
    return Promise.resolve()
}

async function processAsyncTasks(items) {
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    bar.start(items.length, 0)

    await Promise.all(
        items.map(async () => {
            //bar.increment() // bar updates instantly
            const result = await foo()
            bar.increment() // bar not updated
            return result
        })
    )

    bar.stop()
}

const tasklist = [1, 2, 3, 4, 5, 6, 7, 8, 9]

processAsyncTasks(tasklist)
    .then(() => {
        console.log('ready')
    })
    .catch((e) => {
        console.error(e)
    })
