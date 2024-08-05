// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { useEffect, useState, useRef, type LazyExoticComponent, type ReactElement, lazy, Suspense } from 'react'
import type {
    BotDetectionFunction,
    ProcaptchaCallbacks,
    ProcaptchaClientConfigOutput,
    ProcaptchaEvents,
} from '@prosopo/types'
import { ProcaptchaPlaceholder } from '@prosopo/web-components'
import { Procaptcha } from '@prosopo/procaptcha-react'
import { isBot } from '@prosopo/detector'

type ProcaptchaProps = React.ComponentProps<typeof ProcaptchaWidget>
// // https://github.com/microsoft/TypeScript/issues/42873
const ProcaptchaWidget: LazyExoticComponent<(props: any, callbacks: Partial<ProcaptchaEvents>) => ReactElement> = lazy(
    async () => import('./ProcaptchaWidget.js')
)

const customDetectBot: BotDetectionFunction = async () => {
    return await isBot().then((result) => {
        const bot = result.isBot
        return { bot }
    })
}

export const ProcaptchaInvisible = (props: ProcaptchaProps) => {
    const { config, callbacks } = props
    const [componentToRender, setComponentToRender] = useState(<ProcaptchaPlaceholder darkMode={config.theme} />)
    const detectBot = props.detectBot || customDetectBot
    useEffect(() => {
        // add on submit here
        const detectAndSetComponent = async () => {
            const result = await detectBot()
            console.log('Is bot: ', result.bot)
            console.log('Config:', config)
            if (result.bot) {
                setComponentToRender(
                    <Suspense
                        fallback={
                            <div>
                                Protected by <a href="https://prosopo.io">Procaptcha</a>
                            </div>
                        }
                    >
                        <Procaptcha config={config} callbacks={callbacks} />
                    </Suspense>
                )
            } else {
                setComponentToRender(
                    <Suspense
                        fallback={
                            <div>
                                Protected by <a href="https://prosopo.io">Procaptcha</a>
                            </div>
                        }
                    >
                        <ProcaptchaWidget config={config} callbacks={callbacks} />
                    </Suspense>
                )
            }
        }

        detectAndSetComponent()
    }, [config, callbacks, detectBot])

    return componentToRender
}
