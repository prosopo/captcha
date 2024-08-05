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
import { Manager } from '@prosopo/procaptcha-pow'
import type { ProcaptchaProps } from '@prosopo/types'
import { buildUpdateState, useProcaptcha } from '@prosopo/procaptcha-common'
import { useEffect, useRef, useState } from 'react'

const Procaptcha = (props: ProcaptchaProps) => {
    const config = props.config
    const callbacks = props.callbacks || {}
    const buttonElement = props.buttonElement
    const [state, _updateState] = useProcaptcha(useState, useRef)
    // get the state update mechanism
    const updateState = buildUpdateState(state, _updateState)
    const manager = useRef(Manager(config, state, updateState, callbacks))
    const captchaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (buttonElement) {
            buttonElement.addEventListener('click', () => {
                manager.current.resetState()

                const element = captchaRef.current
                if (!element) return

                const form = element.closest('form')
                if (!form) return

                const handleSubmit = () => {
                    manager.current.resetState()
                }

                form.addEventListener('submit', handleSubmit)

                manager.current.start()

                return () => {
                    form.removeEventListener('submit', handleSubmit)
                }
            })
        }
    }, [buttonElement])

    return (
        <div ref={captchaRef}>
            Protected by <a href="https://prosopo.io">Procaptcha</a>
        </div>
    )
}
export default Procaptcha
