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
    WIDGET_DIMENSIONS,
    WIDGET_INNER_HEIGHT,
    WIDGET_URL,
    WIDGET_URL_TEXT,
    WidthBasedStylesDiv,
    darkTheme,
    lightTheme,
} from '@prosopo/web-components'
import { Manager } from '../Services/Manager.js'
import { ProcaptchaCallbacks, ProcaptchaProps } from '@prosopo/types'
import { useProcaptcha } from '@prosopo/procaptcha-common'
import { useRef, useState } from 'react'

const Procaptcha = (props: ProcaptchaProps, callbacks: ProcaptchaCallbacks) => {
    const themeColor = props.config.theme === 'light' ? 'light' : 'dark'
    const theme = props.config.theme === 'light' ? lightTheme : darkTheme
    const [state, updateState] = useProcaptcha(useState, useRef)
    const [checked, setChecked] = updateState({ checked: false })
    const [loading, setLoading] = updateState({ loading: false })
    const handlePowCaptcha = async () => {
        setLoading(true)
        Manager(props.config, state, updateState, callbacks).then((verified) => {
            if (verified && verified.verified) {
                console.log('verified')
                setChecked(true)
            }
            setLoading(false)
        })
    }

    return (
        <div>
            <div style={{ maxWidth: '100%', maxHeight: '100%', overflowX: 'auto' }}>
                <ContainerDiv>
                    <WidthBasedStylesDiv>
                        <div style={WIDGET_DIMENSIONS} data-cy={'button-human'}>
                            {' '}
                            <div
                                style={{
                                    padding: '2px',
                                    border: '1px solid',
                                    backgroundColor: theme.palette.background.default,
                                    borderColor: theme.palette.grey[300],
                                    borderRadius: '4px',
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
                                                    {loading ? (
                                                        <LoadingSpinner themeColor={themeColor} />
                                                    ) : (
                                                        <Checkbox
                                                            checked={checked}
                                                            onChange={handlePowCaptcha}
                                                            themeColor={themeColor}
                                                            labelText={'I am human'}
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
                                            <Logo themeColor={themeColor}></Logo>
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
