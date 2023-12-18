import { CoordEvent, startCollector } from '@prosopo/procaptcha'
import { MutableRefObject, useRef } from 'react'

export default () => {
    const events: MutableRefObject<CoordEvent[]> = useRef<CoordEvent[]>([])
    console.log('Starting collector')
    startCollector(events)
    return <div></div>
}
