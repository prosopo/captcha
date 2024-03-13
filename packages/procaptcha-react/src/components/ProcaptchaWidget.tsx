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
import { Account, GetCaptchaResponse, ProcaptchaCallbacks, ProcaptchaClientConfigInput } from '@prosopo/types'
import {
    Checkbox,
    ContainerDiv,
    LoadingSpinner,
    WIDGET_DIMENSIONS,
    WIDGET_INNER_HEIGHT,
    WIDGET_URL,
    WIDGET_URL_TEXT,
    WidthBasedStylesDiv,
    darkTheme,
    lightTheme,
} from '@prosopo/web-components'
import { Logo } from '@prosopo/web-components'
import {
    Manager,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
    ProsopoCaptchaApi,
    TCaptchaSubmitResult,
} from '@prosopo/procaptcha'
import { useMemo, useRef, useState } from 'react'
import CaptchaComponent from './CaptchaComponent.js'
import Collector from './collector.js'
import Modal from './Modal.js'

/**
 * The props for the Procaptcha component.
 */
export interface ProcaptchaProps {
    // the configuration for procaptcha
    config: ProcaptchaClientConfigInput
    // optional set of callbacks for various captcha events
    callbacks?: Partial<ProcaptchaCallbacks>
}

/**
 * Wrap a ref to be the same format as useState.
 * @param defaultValue the default value if the state is not already initialised
 * @returns a ref in the same format as a state, e.g. [value, setValue]
 */
const useRefAsState = <T,>(defaultValue: T): [T, (value: T) => void] => {
    const ref = useRef<T>(defaultValue)
    const setter = (value: T) => {
        ref.current = value
    }
    const value: T = ref.current
    return [value, setter]
}

const useProcaptcha = (): [ProcaptchaState, ProcaptchaStateUpdateFn] => {
    const [isHuman, setIsHuman] = useState(false)
    const [index, setIndex] = useState(0)
    const [solutions, setSolutions] = useState([] as string[][])
    const [captchaApi, setCaptchaApi] = useRefAsState<ProsopoCaptchaApi | undefined>(undefined)
    const [showModal, setShowModal] = useState(false)
    const [challenge, setChallenge] = useState<GetCaptchaResponse | undefined>(undefined)
    const [loading, setLoading] = useState(false)
    const [account, setAccount] = useState<Account | undefined>(undefined)
    const [dappAccount, setDappAccount] = useState<string | undefined>(undefined)
    const [submission, setSubmission] = useRefAsState<TCaptchaSubmitResult | undefined>(undefined)
    const [timeout, setTimeout] = useRefAsState<NodeJS.Timeout | undefined>(undefined)
    const [blockNumber, setBlockNumber] = useRefAsState<number | undefined>(undefined)
    const [successfullChallengeTimeout, setSuccessfullChallengeTimeout] = useRefAsState<NodeJS.Timeout | undefined>(
        undefined
    )
    const [sendData, setSendData] = useState(false)
    return [
        // the state
        {
            isHuman,
            index,
            solutions,
            captchaApi,
            showModal,
            challenge,
            loading,
            account,
            dappAccount,
            submission,
            timeout,
            blockNumber,
            successfullChallengeTimeout,
            sendData,
        },
        // and method to update the state
        (nextState: Partial<ProcaptchaState>) => {
            if (nextState.account !== undefined) setAccount(nextState.account)
            if (nextState.isHuman !== undefined) setIsHuman(nextState.isHuman)
            if (nextState.index !== undefined) setIndex(nextState.index)
            // force a copy of the array to ensure a re-render
            // nutshell: react doesn't look inside an array for changes, hence changes to the array need to result in a fresh array
            if (nextState.solutions !== undefined) setSolutions(nextState.solutions.slice())
            if (nextState.captchaApi !== undefined) setCaptchaApi(nextState.captchaApi)
            if (nextState.showModal !== undefined) setShowModal(nextState.showModal)
            if (nextState.challenge !== undefined) setChallenge(nextState.challenge)
            if (nextState.loading !== undefined) setLoading(nextState.loading)
            if (nextState.showModal !== undefined) setShowModal(nextState.showModal)
            if (nextState.dappAccount !== undefined) setDappAccount(nextState.dappAccount)
            if (nextState.submission !== undefined) setSubmission(nextState.submission)
            if (nextState.timeout !== undefined) setTimeout(nextState.timeout)
            if (nextState.successfullChallengeTimeout !== undefined) setSuccessfullChallengeTimeout(nextState.timeout)
            if (nextState.blockNumber !== undefined) setBlockNumber(nextState.blockNumber)
            if (nextState.sendData !== undefined) setSendData(nextState.sendData)
        },
    ]
}

const ProcaptchaWidget = (props: ProcaptchaProps) => {
    const config = props.config
    const callbacks = props.callbacks || {}
    const [state, updateState] = useProcaptcha()
    const manager = Manager(config, state, updateState, callbacks)
    const themeColor = props.config.theme === 'light' ? 'light' : 'dark'
    const theme = useMemo(() => (props.config.theme === 'light' ? lightTheme : darkTheme), [props.config.theme])

    return (
        <div>
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
                                    padding: '2px',
                                    border: '1px solid',
                                    backgroundColor: theme.palette.background.default,
                                    borderColor: theme.palette.grey[300],
                                    borderRadius: '8px',
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
                        <Collector onProcessData={manager.exportData} sendData={state.sendData}></Collector>
                    )}
                </ContainerDiv>
            </div>
        </div>
    )
}

export default ProcaptchaWidget
