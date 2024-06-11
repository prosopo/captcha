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
import { darkTheme, lightTheme } from '@prosopo/web-components'
import React, { ButtonHTMLAttributes, CSSProperties, useMemo, useState } from 'react'
import addDataAttr from '../util/index.js'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    themeColor: 'light' | 'dark'
    buttonType: 'cancel' | 'next'
    onClick: () => void
    text: string
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

const Button: React.FC<ButtonProps> = ({ themeColor, buttonType, text, onClick }: ButtonProps) => {
    const theme = useMemo(() => (themeColor === 'light' ? lightTheme : darkTheme), [themeColor])
    const [hover, setHover] = useState(false)
    const buttonStyle = useMemo(() => {
        const baseStyle = {
            ...buttonStyleBase,
            color: hover ? theme.palette.primary.contrastText : theme.palette.background.contrastText,
        }
        if (buttonType === 'cancel') {
            return {
                ...baseStyle,
                backgroundColor: hover ? theme.palette.grey[600] : 'transparent',
            }
        } else {
            return {
                ...baseStyle,
                backgroundColor: hover ? theme.palette.primary.main : theme.palette.background.default,
            }
        }
    }, [buttonType, hover, theme])

    return (
        <button
            {...addDataAttr({ dev: { cy: `button-${buttonType}` } })}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={buttonStyle}
            onClick={(e) => {
                e.preventDefault()
                onClick()
            }}
            aria-label={text}
        >
            {text}
        </button>
    )
}
export default Button
