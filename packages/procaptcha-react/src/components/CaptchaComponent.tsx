// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License"),
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
import { CSSProperties, useMemo } from 'react'
import { CaptchaWidget } from './CaptchaWidget.js'
import { GetCaptchaResponse } from '@prosopo/api'
import { at } from '@prosopo/util'
import { darkTheme, lightTheme } from './theme.js'
import { useTranslation } from '@prosopo/common'
import addDataAttr from '../util/index.js'

export interface CaptchaComponentProps {
    challenge: GetCaptchaResponse
    index: number
    solutions: string[][]
    onSubmit: () => void
    onCancel: () => void
    onClick: (hash: string) => void
    onNext: () => void
    themeColor: 'light' | 'dark'
}

const buttonStyleBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxSizing: 'border-box',
    outline: '0px',
    border: '0px',
    margin: '0px',
    cursor: 'pointer',
    userSelect: 'none',
    verticalAlign: 'middle',
    appearance: undefined,
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.875rem',
    lineHeight: '1.75',
    letterSpacing: '0.02857em',
    textTransform: 'uppercase',
    minWidth: '64px',
    padding: '6px 16px',
    borderRadius: '4px',
    transition:
        'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
    color: 'rgb(0, 0, 0)',
    backgroundColor: '#ffffff',
    boxShadow:
        'rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px',
}

const CaptchaComponent = ({
    challenge,
    index,
    solutions,
    onSubmit,
    onCancel,
    onClick,
    onNext,
    themeColor,
}: CaptchaComponentProps) => {
    const { t } = useTranslation()
    const captcha = challenge.captchas ? at(challenge.captchas, index) : null
    const solution = solutions ? at(solutions, index) : []
    const theme = useMemo(() => (themeColor === 'light' ? lightTheme : darkTheme), [themeColor])
    const buttonStyleCancel: CSSProperties = {
        ...buttonStyleBase,
        backgroundColor: 'transparent',
        color: theme.palette.primary.contrastText,
    }

    const buttonStyleNext: CSSProperties = {
        ...buttonStyleBase,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.primary.contrastText,
    }

    return (
        <div
            style={{
                // introduce scroll bars when screen < minWidth of children
                overflowX: 'auto',
                overflowY: 'auto',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    backgroundColor: theme.palette.background.default,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '300px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        backgroundColor: theme.palette.primary.main,
                        padding: '24px 16px',
                    }}
                >
                    <span
                        style={{
                            color: '#ffffff',
                            fontWeight: 700,
                            lineHeight: 1.5,
                        }}
                    >
                        {t('WIDGET.SELECT_ALL')}
                        {': '}
                    </span>
                    <span
                        style={{
                            color: '#ffffff',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            lineHeight: 1.5,
                        }}
                    >
                        {`${at(challenge.captchas, index).captcha.target}`}
                    </span>
                </div>
                <div {...addDataAttr({ dev: { cy: 'captcha-' + index } })}>
                    {captcha && (
                        <CaptchaWidget
                            challenge={captcha}
                            solution={solution}
                            onClick={onClick}
                            themeColor={themeColor}
                        />
                    )}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                    }}
                    {...addDataAttr({ dev: { cy: 'dots-captcha' } })}
                />
                <div
                    style={{
                        padding: '8px 16px',
                        display: 'flex',
                        width: '100%',
                    }}
                ></div>
                <div
                    style={{
                        paddingTop: 0,
                        paddingBottom: '0 16px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        lineHeight: 1.75,
                    }}
                >
                    <button onClick={onCancel} style={buttonStyleCancel}>
                        {t('WIDGET.CANCEL')}
                    </button>
                    <button
                        style={buttonStyleNext}
                        color="primary"
                        onClick={index < challenge.captchas.length - 1 ? onNext : onSubmit}
                        {...addDataAttr({ dev: { cy: 'button-next' } })}
                    >
                        {index < challenge.captchas.length - 1 ? t('WIDGET.NEXT') : t('WIDGET.SUBMIT')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CaptchaComponent
