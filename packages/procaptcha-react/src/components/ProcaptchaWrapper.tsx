import { ProcaptchaPlaceholder } from './CaptchaPlaceholder.js'
import { Suspense, lazy } from 'react'

type ProcaptchaProps = React.ComponentProps<typeof LazyLoadedComponents>

const LazyLoadedComponents = lazy(async () => import('./Procaptcha.js'))


export const LazyLoadedWrapper = (props: ProcaptchaProps) => (
    <Suspense fallback={<ProcaptchaPlaceholder darkMode={props.config.theme} />}>
        <LazyLoadedComponents config={props.config} callbacks={props.callbacks}></LazyLoadedComponents>
    </Suspense>
)
