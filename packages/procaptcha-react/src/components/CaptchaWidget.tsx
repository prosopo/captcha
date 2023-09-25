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
import { Box, Fade, SvgIcon, Theme, useTheme } from '@mui/material'
import { CaptchaResponseCaptcha } from '@prosopo/procaptcha'
import { default as CheckIcon } from '@mui/icons-material/Check.js'

export interface CaptchaWidgetProps {
    challenge: CaptchaResponseCaptcha
    solution: string[]
    onClick: (hash: string) => void
}

const normalizeIcon = (Icon: typeof SvgIcon) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return ((Icon as any).default ? (Icon as any).default : Icon) as typeof SvgIcon
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore https://github.com/mui/material-ui/issues/35535
const CheckIconNormalized = normalizeIcon(CheckIcon)

const getHash = (item: any) => {
    if (!item.hash) {
        throw new Error('item.hash is undefined')
    }
    return item.hash
}

export const CaptchaWidget = ({ challenge, solution, onClick }: CaptchaWidgetProps) => {
    const items = challenge.captcha.items
    const theme: Theme = useTheme()
    const isTouchDevice = 'ontouchstart' in window

    return (
        <Box
            component="div"
            pr={0.5}
            pb={0.5}
            sx={{
                // expand to full height / width of parent
                width: '100%',
                height: '100%',
                // display children in flex, spreading them evenly and wrapping when row length exceeded
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
            }}
        >
            {items.map((item, index) => {
                const hash = getHash(item)
                return (
                    <Box
                        pt={0.5}
                        pl={0.5}
                        sx={{
                            // enable the items in the grid to grow in width to use up excess space
                            flexGrow: 1,
                            // make the width of each item 1/3rd of the width overall, i.e. 3 columns
                            flexBasis: '33.3333%',
                            // include the padding / margin / border in the width
                            boxSizing: 'border-box',
                        }}
                        key={index}
                    >
                        <Box
                            sx={{ cursor: 'pointer', height: '100%', width: '100%' }}
                            onClick={isTouchDevice ? undefined : () => onClick(hash)}
                            onTouchStart={isTouchDevice ? () => onClick(hash) : undefined}
                        >
                            <Box sx={{ border: 1, borderColor: theme.palette.grey[300] }}>
                                <img
                                    style={{
                                        width: '100%', // image should be full width / height of the item
                                        backgroundColor: theme.palette.grey[300], // colour of the bands when letterboxing and image
                                        opacity: solution.includes(hash) && isTouchDevice ? '50%' : '100%', // iphone workaround
                                        display: 'block', // removes whitespace below imgs
                                        objectFit: 'contain', // contain the entire image in the img tag
                                        aspectRatio: '1/1', // force AR to be 1, letterboxing images with different aspect ratios
                                    }}
                                    src={item.data}
                                    alt={`Captcha image ${index + 1}`}
                                />
                            </Box>
                            <Fade in={solution.includes(hash)}>
                                <Box
                                    sx={{
                                        // relative to where the element _should_ be positioned
                                        position: 'relative',
                                        // make the overlay the full height/width of an item
                                        width: '100%',
                                        height: '100%',
                                        // shift it up 100% to overlay the item element
                                        top: '-100%',
                                        // transition on opacity upon (de)selection
                                        transitionDuration: '300ms',
                                        transitionProperty: 'opacity',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            // make the overlay absolute positioned compare to its container
                                            position: 'absolute',
                                            // spread across 100% width/height of the item box
                                            top: 0,
                                            left: 0,
                                            bottom: 0,
                                            right: 0,
                                            height: '100%',
                                            width: '100%',
                                            // display overlays in center
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            // make bg half opacity, i.e. shadowing the item's img
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                        }}
                                    >
                                        <CheckIconNormalized
                                            htmlColor={theme.palette.background.default}
                                            sx={{
                                                // img must be displayed as block otherwise get's a bottom whitespace border
                                                display: 'block',
                                                // how big the overlay icon is
                                                width: '35%',
                                                height: '35%',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Fade>
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}

//export default CaptchaWidget
