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
import {
    Checkbox,
    ContainerDiv,
    LoadingSpinner,
    Logo,
    WIDGET_BORDER,
    WIDGET_BORDER_RADIUS,
    WIDGET_DIMENSIONS,
    WIDGET_INNER_HEIGHT,
    WIDGET_PADDING,
    WIDGET_URL,
    WIDGET_URL_TEXT,
    WidthBasedStylesDiv,
    darkTheme,
    lightTheme,
} from '@prosopo/web-components'
import { Manager } from '../Services/Manager.js'
import { ProcaptchaProps } from '@prosopo/types'
import { buildUpdateState, useProcaptcha } from '@prosopo/procaptcha-common'
import { useEffect, useRef, useState } from 'react'

const Procaptcha = (props: ProcaptchaProps) => {
    const config = props.config
    const themeColor = config.theme === 'light' ? 'light' : 'dark'
    const theme = props.config.theme === 'light' ? lightTheme : darkTheme
    const callbacks = props.callbacks || {}
    const [state, _updateState] = useProcaptcha(useState, useRef)
    // get the state update mechanism
    const updateState = buildUpdateState(state, _updateState)
    const manager = Manager(config, state, updateState, callbacks)
    const captchaRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const element = captchaRef.current
        if (!element) return

        const form = element.closest('form')
        if (!form) return

        const handleSubmit = () => {
            console.log('Form submitted:', form)
            manager.resetState()
        }

        form.addEventListener('submit', handleSubmit)

        return () => {
            form.removeEventListener('submit', handleSubmit)
        }
    }, [])

    return (
        <div ref={captchaRef}>
            <div style={{ maxWidth: '100%', maxHeight: '100%', overflowX: 'auto' }}>
                <ContainerDiv>
                    <WidthBasedStylesDiv>
                        <div style={WIDGET_DIMENSIONS} data-cy={'button-human'}>
                            {' '}
                            <div
                                style={{
                                    padding: WIDGET_PADDING,
                                    border: WIDGET_BORDER,
                                    backgroundColor: theme.palette.background.default,
                                    borderColor: theme.palette.grey[300],
                                    borderRadius: WIDGET_BORDER_RADIUS,
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    minHeight: `${WIDGET_INNER_HEIGHT}px`,
                                    overflow: 'hidden',
                                }}
                            >
                                <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'flex-start',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexDirection: 'column',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    {state.loading ? (
                                                        <LoadingSpinner
                                                            themeColor={themeColor}
                                                            aria-label="Loading spinner"
                                                        />
                                                    ) : (
                                                        <Checkbox
                                                            checked={state.isHuman}
                                                            onChange={manager.start}
                                                            themeColor={themeColor}
                                                            labelText={'I am human'}
                                                            aria-label="human checkbox"
                                                        ></Checkbox>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                                    <a href={WIDGET_URL} target="_blank" aria-label={WIDGET_URL_TEXT}>
                                        <div style={{ flex: 1 }}>
                                            <Logo themeColor={themeColor} aria-label="Prosopo logo"></Logo>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </WidthBasedStylesDiv>
                </ContainerDiv>
            </div>
        </div>
    )
}
export default Procaptcha
