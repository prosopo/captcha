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
import { Procaptcha } from '@prosopo/procaptcha-react'
import { ProcaptchaPlaceholder } from '@prosopo/web-components'
import { ProcaptchaPow } from '@prosopo/procaptcha-pow'
import { useEffect, useState } from 'react'
import { BotDetectionFunction, ProcaptchaFrictionlessProps } from '@prosopo/types'
import { isBot } from '@prosopo/detector'

const customDetectBot: BotDetectionFunction = async () => {
    return await isBot().then((result) => {
        const bot = result.isBot
        return { bot }
    })
}

export const ProcaptchaFrictionless = ({
    config,
    callbacks,
    detectBot = customDetectBot,
}: ProcaptchaFrictionlessProps) => {
    const [componentToRender, setComponentToRender] = useState(<ProcaptchaPlaceholder darkMode={config.theme} />)

    useEffect(() => {
        const detectAndSetComponent = async () => {
            const result = await detectBot()
            if (result.bot) {
                setComponentToRender(<Procaptcha config={config} callbacks={callbacks} />)
            } else {
                setComponentToRender(<ProcaptchaPow config={config} callbacks={callbacks} />)
            }
        }

        detectAndSetComponent()
    }, [config, callbacks, detectBot])

    return componentToRender
}
