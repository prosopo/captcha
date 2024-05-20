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
/** @jsxImportSource @emotion/react */
import {
    Checkbox,
    ContainerDiv,
    LoadingSpinner,
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
import { Logo } from '@prosopo/web-components'
import { Manager } from '@prosopo/procaptcha'
import { ProcaptchaProps } from '@prosopo/types'
import { useProcaptcha } from '@prosopo/procaptcha-common'
import { useRef, useState } from 'react'
import CaptchaComponent from './CaptchaComponent.js'
import Collector from './collector.js'
import Modal from './Modal.js'

const ProcaptchaWidget = (props: ProcaptchaProps) => {
    const config = props.config
    const callbacks = props.callbacks || {}
    const [state, updateState] = useProcaptcha(useState, useRef)
    const manager = Manager(config, state, updateState, callbacks)
    const themeColor = props.config.theme === 'light' ? 'light' : 'dark'
    const theme = props.config.theme === 'light' ? lightTheme : darkTheme

    return (
        <div style={{ flex: 'auto' }}>
            <div style={{ maxWidth: '100%', maxHeight: '100%', overflowX: 'auto' }}>
                <Modal show={state.showModal}>
                    {state.challenge ? (
                        <CaptchaComponent
                            challenge={state.challenge}
                            index={state.index}
                            solutions={state.solutions}
                            onSubmit={manager.submit}
                            onCancel={manager.cancel}
                            onClick={manager.select}
                            onNext={manager.nextRound}
                            themeColor={config.theme ?? 'light'}
                        />
                    ) : (
                        <div>No challenge set.</div>
                    )}
                </Modal>
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
                                            alignItems: 'center',
                                            flex: 1,
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
                                                    display: !state.loading ? 'flex' : 'none',
                                                }}
                                            >
                                                <Checkbox
                                                    themeColor={themeColor}
                                                    onChange={manager.start}
                                                    checked={state.isHuman}
                                                    labelText="I am human"
                                                />
                                            </div>
                                            <div
                                                style={{
                                                    display: state.loading ? 'flex' : 'none',
                                                }}
                                            >
                                                <div style={{ display: 'inline-flex' }}>
                                                    <LoadingSpinner themeColor={themeColor} />
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
                    {config.devOnlyWatchEvents && (
                        <Collector
                            onProcessData={manager.exportData}
                            sendData={state.sendData}
                            account={state.account}
                        ></Collector>
                    )}
                </ContainerDiv>
            </div>
        </div>
    )
}

export default ProcaptchaWidget
