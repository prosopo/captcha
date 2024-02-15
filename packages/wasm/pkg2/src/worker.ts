export type Message2 = {
    command: 'hash' | 'report'
}

export type Event2 = {
    data: Message2
}

export type Report2 = {
    count: number
}

self.addEventListener('message', (e: Event2) => {
    if (e.data.command !== 'hash') {
        throw new Error('unexpected command')
    }
    let time = Date.now()
    let count = 0
    while (true) {
        count++
        const now = Date.now()
        const interval = now - time
        if (interval > 1000) {
            const msg: Report2 = {
                count,
            }
            self.postMessage(msg)
            time = Date.now()
        }
    }
});
