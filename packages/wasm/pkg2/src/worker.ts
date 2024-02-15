export type Message2 = {
    command: 'hash'
}

export type Event2 = {
    data: Message2
}

export const exec = async (e: Event2): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        // other code can send messages to this worker, so protect against invalid messages
        if (e.data.command !== 'hash') {
            console.log(`unknown event: ${JSON.stringify(e)}`)
            return;
        }
        let i = 0;
        let lastTime = Date.now();
        while (true) {
            if (Date.now() - lastTime > 1000) {
                // report every 1 second
                self.postMessage(i);
                lastTime = Date.now();
                i = 0;
            }
            i++;
        }
    })
}

self.addEventListener('message', 
exec);
