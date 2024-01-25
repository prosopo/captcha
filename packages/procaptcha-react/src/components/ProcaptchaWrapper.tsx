import { ProcaptchaPlaceholder } from './CaptchaPlaceholder.js'
import React from 'react'

const LazyLoadedComponents = React.lazy(async () => {
    console.log("lazy loading procaptcha now!")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return import('./Procaptcha.js')
})

type ProcaptchaProps = React.ComponentProps<typeof LazyLoadedComponents>

export function LazyLoadedWrapper(props: ProcaptchaProps) {
    return (
        <React.Suspense fallback={<ProcaptchaPlaceholder darkMode={props.config.theme} />}>
            <LazyLoadedComponents config={props.config} callbacks={props.callbacks}></LazyLoadedComponents>
        </React.Suspense>
    )
}
