import { Account, ProsopoKeyboardEvent, ProsopoMouseEvent, ProsopoTouchEvent, StoredEvents } from '@prosopo/types'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { startCollector } from '@prosopo/procaptcha'

type CollectorProps = {
    onProcessData: (data: StoredEvents) => void
    sendData: boolean
    account: Account | undefined
}

const Collector = ({ onProcessData, sendData, account }: CollectorProps) => {
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
        if (account) onProcessData(userEvents)
    }, [sendData, account])

    return <div ref={ref}></div>
}

export default Collector
