import { CoordEvent, startCollector } from '@prosopo/procaptcha'
import { useEffect, useRef } from 'react'

useEffect(() => {
    console.log('Component rendered')
}, [])

export default () => {
    const events = useRef<CoordEvent[]>([])
    console.log('Starting collector')
    startCollector(events)
    return <div></div>
}
