import { CoordEvent, startCollector } from '@prosopo/procaptcha'
import { MutableRefObject, useEffect, useRef, useState } from 'react'

type CollectorProps = {
    onProcessData: (data: CoordEvent[]) => void
    showModal: boolean // New prop
}

const Collector = ({ onProcessData, showModal }: CollectorProps) => {
    const [storedEvents, setStoredEvents] = useState<CoordEvent[]>([])

    const ref: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null)

    // Start the component once to initialise the collector events like mousemove
    useEffect(() => {
        if (ref && ref.current) {
            console.log('ref', ref)
            startCollector(ref.current, setStoredEvents)
        }
        console.log('storedEvents', storedEvents)
    }, [])

    return <div ref={ref}></div>
}

export default Collector
