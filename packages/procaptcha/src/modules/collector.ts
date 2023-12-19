export type CoordEvent = [number, number, number]
type SetCoordEvents = (events: (currentEvents: CoordEvent[]) => CoordEvent[]) => void

const COLLECTOR_LIMIT = 10000

export const storeLog = (event: CoordEvent[], setEvents: SetCoordEvents) => {
    setEvents((currentEvents: CoordEvent[]) => {
        console.log('currentEvents', currentEvents)
        const newEvents = currentEvents.length >= COLLECTOR_LIMIT ? currentEvents.slice(1) : currentEvents
        return [...newEvents, ...event]
    })
}

const logMouseEvent = (event: MouseEvent, setEvents: SetCoordEvents) => {
    const coordEvent: CoordEvent = [event.screenX, event.screenY, event.timeStamp]
    storeLog([coordEvent], setEvents)
}

const logTouchEvent = (event: TouchEvent, setEvents: SetCoordEvents) => {
    const coords: CoordEvent[] = Array.from(event.touches).map(
        (touch): CoordEvent => [touch.screenX, touch.screenY, event.timeStamp]
    )
    storeLog(coords, setEvents)
}

export const startCollector = (formElement: HTMLDivElement, setEvents: SetCoordEvents) => {
    const mouseMoveHandler = (e: MouseEvent) => logMouseEvent(e, setEvents)
    const touchHandler = (e: TouchEvent) => logTouchEvent(e, setEvents)

    formElement.addEventListener('mousemove', mouseMoveHandler)
    formElement.addEventListener('touchstart', touchHandler)
    formElement.addEventListener('touchend', touchHandler)
    formElement.addEventListener('touchcancel', touchHandler)
    formElement.addEventListener('touchmove', touchHandler)

    // Cleanup
    return () => {
        formElement.removeEventListener('mousemove', mouseMoveHandler)
        formElement.removeEventListener('touchstart', touchHandler)
        formElement.removeEventListener('touchend', touchHandler)
        formElement.removeEventListener('touchcancel', touchHandler)
        formElement.removeEventListener('touchmove', touchHandler)
    }
}
