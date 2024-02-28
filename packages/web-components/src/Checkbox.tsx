import { css } from '@emotion/react'
import { darkTheme, lightTheme } from './theme.js'
import React, { ButtonHTMLAttributes, CSSProperties, useMemo, useState } from 'react'

interface CheckboxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    themeColor: 'light' | 'dark'
    checked: boolean
    onChange: () => void
}

const checkboxBefore = css`{
  &:before {
    content: '""';
    position: absolute;
    height: 100%;
    width: 100%;
  }
}`

const baseStyle: CSSProperties = {
    width: '2.2em',
    height: '2.2em',
    top: 'auto',
    left: 'auto',
    opacity: '1',
    borderRadius: '12.5%',
    appearance: 'none',
    cursor: 'pointer',
    margin: '0',
    borderStyle: 'solid',
    borderWidth: '1px',
}

export const Checkbox: React.FC<CheckboxProps> = ({ themeColor, onChange, checked }: CheckboxProps) => {
    const theme = useMemo(() => (themeColor === 'light' ? lightTheme : darkTheme), [themeColor])
    const checkboxStyleBase: CSSProperties = {
        ...baseStyle,
        border: `1px solid ${theme.palette.background.contrastText}`,
    }

    const [hover, setHover] = useState(false)

    const checkboxStyle: CSSProperties = useMemo(() => {
        return {
            ...checkboxStyleBase,
            borderColor: hover ? theme.palette.background.contrastText : theme.palette.grey[400],
            appearance: checked ? 'auto' : 'none',
        }
    }, [hover, theme, checked])

    return (
        <input
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            css={checkboxBefore}
            type={'checkbox'}
            aria-live={'assertive'}
            aria-haspopup={'true'}
            onChange={onChange}
            checked={checked}
            style={checkboxStyle}
        />
    )
}
export default Checkbox
