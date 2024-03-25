// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ProsopoKeyboardEvent, ProsopoMouseEvent, ProsopoTouchEvent } from '@prosopo/types'

const COLLECTOR_LIMIT = 10000

type SetStateAction<T> = T | ((prevState: T) => T)
type SetStateEvent<T> = (setValueFunc: SetStateAction<T[]>) => void
type SetMouseEvent = (setValueFunc: SetStateAction<ProsopoMouseEvent[]>) => void
type SetKeyboardEvent = (setValueFunc: SetStateAction<ProsopoKeyboardEvent[]>) => void
type SetTouchEvent = (setValueFunc: SetStateAction<ProsopoTouchEvent[]>) => void

const storeLog = <T>(event: T, setEvents: SetStateEvent<T>) => {
    setEvents((currentEvents) => {
        let newEvents = [...currentEvents, event]
        if (newEvents.length > COLLECTOR_LIMIT) {
            newEvents = newEvents.slice(1)
        }
        return newEvents
    })
}

const logMouseEvent = (event: globalThis.MouseEvent, setMouseEvent: SetMouseEvent) => {
    const storedEvent: ProsopoMouseEvent = {
        x: event.x,
        y: event.y,
        timestamp: event.timeStamp,
    }
    storeLog(storedEvent, setMouseEvent)
}

const logKeyboardEvent = (event: globalThis.KeyboardEvent, setKeyboardEvent: SetKeyboardEvent) => {
    const storedEvent: ProsopoKeyboardEvent = {
        key: event.key,
        timestamp: event.timeStamp,
        isShiftKey: event.shiftKey,
        isCtrlKey: event.ctrlKey,
    }
    storeLog(storedEvent, setKeyboardEvent)
}

const logTouchEvent = (event: globalThis.TouchEvent, setTouchEvent: SetTouchEvent) => {
    for (const touch of Array.from(event.touches)) {
        storeLog({ x: touch.clientX, y: touch.clientY, timestamp: event.timeStamp }, setTouchEvent)
    }
}

export const startCollector = (
    setStoredMouseEvents: SetMouseEvent,
    setStoredTouchEvents: SetTouchEvent,
    setStoredKeyboardEvents: SetKeyboardEvent,
    rootElement: HTMLDivElement
) => {
    const form = findContainingForm(rootElement)
    if (form) {
        // Add listeners to mouse
        form.addEventListener('mousemove', (e) => logMouseEvent(e, setStoredMouseEvents))

        // Add listeners to keyboard
        form.addEventListener('keydown', (e) => logKeyboardEvent(e, setStoredKeyboardEvents))
        form.addEventListener('keyup', (e) => logKeyboardEvent(e, setStoredKeyboardEvents))

        // Add listeners to touch
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
