import { CoordEvent, startCollector } from '@prosopo/procaptcha'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'

const Collector = () => {
    const [storedEvents, setStoredEvents] = useState<CoordEvent[]>([])

    const ref: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null)

    // Start the component once to initialise the collector events like mousemove
    useEffect(() => {
        if (ref && ref.current) {
            console.log('ref', ref)
            startCollector(storedEvents, setStoredEvents, ref.current)
        }
    }, [])

    // Only render the component once but store the events in state whenever they are detected
    useEffect(() => {
        setStoredEvents(storedEvents)
    }, [storedEvents])

    return <div ref={ref}></div>
}

export default Collector
