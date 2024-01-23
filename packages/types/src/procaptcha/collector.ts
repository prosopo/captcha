export type ProsopoMouseEvent = {
    x: number
    y: number
    timestamp: number
}

export type ProsopoTouchEvent = {
    x: number
    y: number
    timestamp: number
}

export type ProsopoKeyboardEvent = {
    key: string
    timestamp: number
    isShiftKey: boolean
    isCtrlKey: boolean
}

export type StoredEvents = {
    mouseEvents?: ProsopoMouseEvent[]
    touchEvents?: ProsopoTouchEvent[]
    keyboardEvents?: ProsopoKeyboardEvent[]
}

export interface StoredEventRecord extends StoredEvents {
    accountId: string
}
