import { ProcaptchaPlaceholder } from '@prosopo/web-components'
import { Suspense, lazy } from 'react'

const ProcaptchaWidget = lazy(async () => import('./ProcaptchaWidget.js'))
type ProcaptchaProps = React.ComponentProps<typeof ProcaptchaWidget>

const Procaptcha = (props: ProcaptchaProps) => (
    <Suspense fallback={<ProcaptchaPlaceholder darkMode={props.config.theme} />}>
        <ProcaptchaWidget config={props.config} callbacks={props.callbacks} />
    </Suspense>
)

export default Procaptcha
