/** @jsx jsx */
/** @jsxImportSource @emotion/react */
import { darkTheme, lightTheme } from './theme.js'
import { useMemo } from 'react'
import styled from '@emotion/styled'

export interface LoadingSpinnerComponentProps {
    themeColor: 'light' | 'dark'
}

export const LoadingSpinner = ({ themeColor }: LoadingSpinnerComponentProps) => {
    const theme = useMemo(() => (themeColor === 'light' ? lightTheme : darkTheme), [themeColor])
    const StyledDiv = styled.div`
        width: 2em;
        height: 2em;
        border: 4px solid ${theme.palette.background.contrastText};
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inherit;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
        @keyframes rotation {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
        }
    `
    return <StyledDiv></StyledDiv>
}

export default LoadingSpinner
