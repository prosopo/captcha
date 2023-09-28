// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { Box, Button, Typography } from '@mui/material'
import { CaptchaWidget } from './CaptchaWidget.js'
import { GetCaptchaResponse } from '@prosopo/api'
import { at } from '@prosopo/util'
import { darkTheme, lightTheme } from './theme.js'
import { useMemo } from 'react'
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
        <Box
            sx={{
                // introduce scroll bars when screen < minWidth of children
                overflowX: 'auto',
                overflowY: 'auto',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '100%',
            }}
        >
            <Box
                bgcolor={theme.palette.background.default}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '300px',
                }}
            >
                <Box
                    px={2}
                    py={3}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                    }}
                    bgcolor={theme.palette.primary.main}
                >
                    <Typography
                        sx={{
                            color: '#ffffff',
                            fontWeight: 700,
                        }}
                    >
                        {t('WIDGET.SELECT_ALL')}
                        {': '}
                    </Typography>
                    <Typography
                        px={1}
                        sx={{
                            color: '#ffffff',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            fontSize: theme.typography.h6.fontSize,
                        }}
                    >
                        {`${at(challenge.captchas, index).captcha.target}`}
                    </Typography>
                </Box>
                <Box {...addDataAttr({ dev: { cy: 'captcha-' + index } })}>
                    {captcha && <CaptchaWidget challenge={captcha} solution={solution} onClick={onClick} />}
                </Box>
                <Box
                    px={2}
                    py={1}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                    }}
                    {...addDataAttr({ dev: { cy: 'dots-captcha' } })}
                />
                <Box
                    px={2}
                    pt={0}
                    pb={2}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Button onClick={onCancel} variant="text">
                        {t('WIDGET.CANCEL')}
                    </Button>
                    <Button
                        color="primary"
                        onClick={index < challenge.captchas.length - 1 ? onNext : onSubmit}
                        variant="contained"
                        {...addDataAttr({ dev: { cy: 'button-next' } })}
                    >
                        {index < challenge.captchas.length - 1 ? t('WIDGET.NEXT') : t('WIDGET.SUBMIT')}
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

export default CaptchaComponent
