export type CoordEvent = [number, number, number]
interface MutableRefObject<T> {
    current: T
}
export const storeLog = (event: CoordEvent[], events: CoordEvent[]) => {
    //store in react state
    events = events ? events.concat(event) : event
    // store in session storage for debugging only
    window.sessionStorage.setItem('procaptchaLog', JSON.stringify(events))
}

export const logEvent = (event: MouseEvent | TouchEvent, events: CoordEvent[]) => {
    const coords =
        event instanceof MouseEvent
            ? [[event.screenX, event.screenY, event.timeStamp] as CoordEvent]
            : Array.from(event.touches).map((touch): CoordEvent => [touch.screenX, touch.screenY, event.timeStamp])
    storeLog(coords, events)
}

export const startCollector = (events: MutableRefObject<CoordEvent[]>) => {
    console.log('Starting collector')
    document.addEventListener('mousemove', (e) => {
        logEvent(e, events.current)
    })
    document.addEventListener('touchstart', (e) => {
        logEvent(e, events.current)
    })
    document.addEventListener('touchend', (e) => {
        logEvent(e, events.current)
    })
    document.addEventListener('touchcancel', (e) => {
        logEvent(e, events.current)
    })
    document.addEventListener('touchmove', (e) => {
        logEvent(e, events.current)
    })
}
