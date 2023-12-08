import { darkTheme, lightTheme } from './theme.js'
import React, { ButtonHTMLAttributes, CSSProperties, useMemo } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    themeColor: 'light' | 'dark'
    buttonType: 'cancel' | 'next'
    onClick: () => void
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

const Button: React.FC<ButtonProps> = ({ themeColor, buttonType, onClick }: ButtonProps) => {
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
    if (buttonType === 'cancel') {
        return (
            <button
                style={buttonStyleCancel}
                onClick={(e) => {
                    e.preventDefault()
                    return onClick()
                }}
            >
                Cancel
            </button>
        )
    } else {
        return (
            <button
                style={buttonStyleNext}
                onClick={(e) => {
                    e.preventDefault()
                    return onClick()
                }}
            >
                Next
            </button>
        )
    }
}

export default Button
