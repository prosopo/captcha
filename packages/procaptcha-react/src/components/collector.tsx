import { startCollector } from '@prosopo/procaptcha'
import type {
    ProsopoKeyboardEvent,
    ProsopoMouseEvent,
    ProsopoTouchEvent,
    StoredEvents,
} from '@prosopo/types'
import { type MutableRefObject, useEffect, useRef, useState } from 'react'

type CollectorProps = {
    onProcessData: (data: StoredEvents) => void
    sendData: boolean
}

const Collector = ({ onProcessData, sendData }: CollectorProps) => {
    const [mouseEvents, setStoredMouseEvents] = useState<ProsopoMouseEvent[]>(
        []
    )
    const [touchEvents, setStoredTouchEvents] = useState<ProsopoTouchEvent[]>(
        []
    )
    const [keyboardEvents, setStoredKeyboardEvents] = useState<
        ProsopoKeyboardEvent[]
    >([])

    const ref: MutableRefObject<HTMLDivElement | null> =
        useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref?.current) {
            startCollector(
                setStoredMouseEvents,
                setStoredTouchEvents,
                setStoredKeyboardEvents,
                ref.current
            )
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

    return <div ref={ref} />
}

export default Collector
