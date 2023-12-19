export type CoordEvent = [number, number, number]

const COLLECTOR_LIMIT = 1000

export const storeLog = (event: CoordEvent[], events: CoordEvent[], setEvents: (events: CoordEvent[]) => void) => {
    //store in react state
    events = events ? events.concat(event) : event
    if (events.length > COLLECTOR_LIMIT) {
        events = events.slice(events.length - COLLECTOR_LIMIT)
    }
    // store in session storage for debugging only
    window.sessionStorage.setItem('procaptchaLog', JSON.stringify(events))
    console.log('Sending events back to React', JSON.stringify(events))
    setEvents(events)
}

export const logEvent = (
    event: MouseEvent | TouchEvent,
    events: CoordEvent[],
    setEvents: (events: CoordEvent[]) => void
) => {
    console.log('Existing events', events)
    const coords =
        event instanceof MouseEvent
            ? [[event.screenX, event.screenY, event.timeStamp] as CoordEvent]
            : Array.from(event.touches).map((touch): CoordEvent => [touch.screenX, touch.screenY, event.timeStamp])
    console.log('Logging event', coords)
    storeLog(coords, events, setEvents)
}

export const startCollector = (
    events: CoordEvent[],
    setEvents: (events: CoordEvent[]) => void,
    rootElement: HTMLDivElement
) => {
    // root element is HTML element
    console.log('Starting collector')
    const form = findContainingForm(rootElement)
    if (form) {
        console.log('Found form', form)
        form.addEventListener('mousemove', (e) => {
            logEvent(e, events, setEvents)
        })
        form.addEventListener('touchstart', (e) => {
            logEvent(e, events, setEvents)
        })
        form.addEventListener('touchend', (e) => {
            logEvent(e, events, setEvents)
        })
        form.addEventListener('touchcancel', (e) => {
            logEvent(e, events, setEvents)
        })
        form.addEventListener('touchmove', (e) => {
            logEvent(e, events, setEvents)
        })
    }
}

const findContainingForm = (element: Element): HTMLFormElement | null => {
    if (element.tagName === 'FORM') {
        return element as HTMLFormElement
    }
    if (element.parentElement) {
        return findContainingForm(element.parentElement)
    }
    return null
}
