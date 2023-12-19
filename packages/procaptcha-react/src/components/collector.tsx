import { ProsopoKeyboardEvent, ProsopoMouseEvent, ProsopoTouchEvent, startCollector } from '@prosopo/procaptcha'
import { MutableRefObject, useEffect, useRef, useState } from 'react'

type CollectorProps = {
    onProcessData: (data: StoredEvents) => void
    sendData: boolean
}

export type StoredEvents = {
    mouseEvents?: ProsopoMouseEvent[]
    touchEvents?: ProsopoTouchEvent[]
    keyboardEvents?: ProsopoKeyboardEvent[]
}

const Collector = ({ onProcessData, sendData }: CollectorProps) => {
    const [mouseEvents, setStoredMouseEvents] = useState<ProsopoMouseEvent[]>([])
    const [touchEvents, setStoredTouchEvents] = useState<ProsopoTouchEvent[]>([])
    const [keyboardEvents, setStoredKeyboardEvents] = useState<ProsopoKeyboardEvent[]>([])

    const ref: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref && ref.current) {
            startCollector(setStoredMouseEvents, setStoredTouchEvents, setStoredKeyboardEvents, ref.current)
        }
    }, [])

    useEffect(() => {
        const userEvents = {
            mouseEvents,
            touchEvents,
            keyboardEvents,
        }

        onProcessData(userEvents)
    }, [sendData])

    return <div ref={ref}></div>
}

export default Collector
