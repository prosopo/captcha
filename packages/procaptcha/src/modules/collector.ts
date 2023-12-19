export type ProsopoMouseEvent = {
    x: number
    y: number
    timestamp: number
}

export type ProsopoTouchEvent = {
    x: number | undefined
    y: number | undefined
    timestamp: number
}

export type ProsopoKeyboardEvent = {
    key: string
    timestamp: number
    isShiftKey: boolean
    isCtrlKey: boolean
}

const COLLECTOR_LIMIT = 1000

const storeLog = <T>(event: T, setEvents: React.Dispatch<React.SetStateAction<T[]>>) => {
    setEvents((currentEvents) => {
        console.log(currentEvents, 'currentEvents\n\n\\n_______________________\n\n')
        let newEvents = [...currentEvents, event]
        if (newEvents.length > COLLECTOR_LIMIT) {
            newEvents = newEvents.slice(1)
        }
        return newEvents
    })
}

const logMouseEvent = (
    event: globalThis.MouseEvent,
    setMouseEvent: React.Dispatch<React.SetStateAction<ProsopoMouseEvent[]>>
) => {
    const storedEvent: ProsopoMouseEvent = {
        x: event.x,
        y: event.y,
        timestamp: event.timeStamp,
    }
    storeLog(storedEvent, setMouseEvent)
}

const logKeyboardEvent = (
    event: globalThis.KeyboardEvent,
    setKeyboardEvent: React.Dispatch<React.SetStateAction<ProsopoKeyboardEvent[]>>
) => {
    const storedEvent: ProsopoKeyboardEvent = {
        key: event.key,
        timestamp: event.timeStamp,
        isShiftKey: event.shiftKey,
        isCtrlKey: event.ctrlKey,
    }
    storeLog(storedEvent, setKeyboardEvent)
}

const logTouchEvent = (
    event: globalThis.TouchEvent,
    setTouchEvent: React.Dispatch<React.SetStateAction<ProsopoTouchEvent[]>>
) => {
    // Iterate over the TouchList (map doesn't work on TouchList)
    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i]
        storeLog({ x: touch?.clientX, y: touch?.clientY, timestamp: event.timeStamp }, setTouchEvent)
    }
}

export const startCollector = (
    setStoredMouseEvents: React.Dispatch<React.SetStateAction<ProsopoMouseEvent[]>>,
    setStoredTouchEvents: React.Dispatch<React.SetStateAction<ProsopoTouchEvent[]>>,
    setStoredKeyboardEvents: React.Dispatch<React.SetStateAction<ProsopoKeyboardEvent[]>>,
    rootElement: HTMLDivElement
) => {
    const form = findContainingForm(rootElement)
    if (form) {
        form.addEventListener('mousemove', (e) => logMouseEvent(e, setStoredMouseEvents))

        form.addEventListener('keydown', (e) => logKeyboardEvent(e, setStoredKeyboardEvents))
        form.addEventListener('keyup', (e) => logKeyboardEvent(e, setStoredKeyboardEvents))

        form.addEventListener('touchstart', (e) => logTouchEvent(e, setStoredTouchEvents))
        form.addEventListener('touchend', (e) => logTouchEvent(e, setStoredTouchEvents))
        form.addEventListener('touchcancel', (e) => logTouchEvent(e, setStoredTouchEvents))
        form.addEventListener('touchmove', (e) => logTouchEvent(e, setStoredTouchEvents))
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
