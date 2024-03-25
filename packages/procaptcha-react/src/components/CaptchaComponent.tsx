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
import { CaptchaResponseBody } from '@prosopo/types'
import { CaptchaWidget } from './CaptchaWidget.js'
import { Suspense, useMemo } from 'react'
import { at } from '@prosopo/util'
import { darkTheme, lightTheme } from '@prosopo/web-components'
import { useTranslation } from '@prosopo/common'
import Button from './Button.js'
import addDataAttr from '../util/index.js'

export interface CaptchaComponentProps {
    challenge: CaptchaResponseBody
    index: number
    solutions: string[][]
    onSubmit: () => void
    onCancel: () => void
    onClick: (hash: string) => void
    onNext: () => void
    themeColor: 'light' | 'dark'
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

    return (
        <Suspense fallback={<div>Loading...</div>}>
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
                        <p
                            style={{
                                color: '#ffffff',
                                fontWeight: 700,
                                lineHeight: 1.5,
                            }}
                        >
                            {t('WIDGET.SELECT_ALL')}
                            {': '}
                        </p>
                        <p
                            style={{
                                color: '#ffffff',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                lineHeight: 1.5,
                            }}
                        >
                            {`${at(challenge.captchas, index).captcha.target}`}
                        </p>
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
                            padding: '0 16px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            lineHeight: 1.75,
                        }}
                    >
                        <Button
                            themeColor={themeColor}
                            buttonType="cancel"
                            onClick={onCancel}
                            text={t('WIDGET.CANCEL')}
                        ></Button>
                        <Button
                            themeColor={themeColor}
                            buttonType="next"
                            text={index < challenge.captchas.length - 1 ? t('WIDGET.NEXT') : t('WIDGET.SUBMIT')}
                            onClick={index < challenge.captchas.length - 1 ? onNext : onSubmit}
                        ></Button>
                    </div>
                </div>
            </div>
        </Suspense>
    )
}

export default CaptchaComponent
