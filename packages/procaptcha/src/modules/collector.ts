export type CoordEvent = [number, number, number]
interface MutableRefObject<T> {
    current: T
}

const COLLECTOR_LIMIT = 1000

export const storeLog = (event: CoordEvent[], events: CoordEvent[]) => {
    //store in react state
    events = events ? events.concat(event) : event
    if (events.length > COLLECTOR_LIMIT) {
        events = events.slice(events.length - COLLECTOR_LIMIT)
    }
    // store in session storage for debugging only
    window.sessionStorage.setItem('procaptchaLog', JSON.stringify(events))
}

export const logEvent = (event: MouseEvent | TouchEvent, events: CoordEvent[]) => {
    console.log('Existing events', events)
    const coords =
        event instanceof MouseEvent
            ? [[event.screenX, event.screenY, event.timeStamp] as CoordEvent]
            : Array.from(event.touches).map((touch): CoordEvent => [touch.screenX, touch.screenY, event.timeStamp])
    storeLog(coords, events)
}

export const startCollector = (events: MutableRefObject<CoordEvent[]>) => {
    console.log('Starting collector')
    const form = findContainingForm(document.activeElement as HTMLElement)
    if (form) {
        console.log('Found form', form)
        form.addEventListener('mousemove', (e) => {
            logEvent(e, events.current)
        })
        form.addEventListener('touchstart', (e) => {
            logEvent(e, events.current)
        })
        form.addEventListener('touchend', (e) => {
            logEvent(e, events.current)
        })
        form.addEventListener('touchcancel', (e) => {
            logEvent(e, events.current)
        })
        form.addEventListener('touchmove', (e) => {
            logEvent(e, events.current)
        })
    }
}

const findContainingForm = (element: HTMLElement): HTMLFormElement | null => {
    if (element.tagName === 'FORM') {
        return element as HTMLFormElement
    }
    if (element.parentElement) {
        return findContainingForm(element.parentElement)
    }
    return null
}
