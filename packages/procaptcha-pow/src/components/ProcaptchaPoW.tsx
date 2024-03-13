import { ProcaptchaPlaceholder } from '@prosopo/web-components'
import { Suspense, lazy } from 'react'

const ProcaptchaWidget = lazy(async () => import('./Captcha.js'))
type ProcaptchaProps = React.ComponentProps<typeof ProcaptchaWidget>

export const ProcaptchaPow = (props: ProcaptchaProps) => (
    <Suspense
        fallback={<ProcaptchaPlaceholder darkMode={props.config.theme} />}
    >
        <ProcaptchaWidget config={props.config} callbacks={props.callbacks} />
    </Suspense>
)
