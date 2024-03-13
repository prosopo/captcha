import { css } from '@emotion/react'
import type React from 'react'
import { type ButtonHTMLAttributes, type CSSProperties, useId, useMemo, useState } from 'react'
import { darkTheme, lightTheme } from './theme.js'

interface CheckboxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    themeColor: 'light' | 'dark'
    checked: boolean
    onChange: () => void
    labelText: string
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
    width: '28px',
    height: '28px',
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

export const Checkbox: React.FC<CheckboxProps> = ({ themeColor, onChange, checked, labelText }: CheckboxProps) => {
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
            flex: 1,
            margin: '0 15px',
        }
    }, [hover, theme, checked])
    const id = useId()
    return (
        <span style={{ display: 'inline-flex' }}>
            <input
                name={id}
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
            <label
                css={{
                    color: theme.palette.background.contrastText,
                    position: 'relative',
                    display: 'flex',
                    cursor: 'pointer',
                    userSelect: 'none',
                    top: '4px',
                }}
                htmlFor={id}
            >
                {labelText}
            </label>
        </span>
    )
}
export default Checkbox
