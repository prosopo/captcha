import styled from '@emotion/styled'
import type React from 'react'
import type { ButtonHTMLAttributes } from 'react'
import LogoWithText from './LogoWithText.js'
import LogoWithoutText from './LogoWithoutText.js'

interface LogoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    themeColor: 'light' | 'dark'
}

const LogoContainer = styled.div`
    padding: 8px;
    flex: 1 1 0;
`

const LogoInnerContainer = styled.div`
    padding: 8px;
`

const Logo: React.FC<LogoProps> = ({ themeColor }: LogoProps) => {
    return (
        <LogoContainer>
            <LogoInnerContainer>
                <LogoWithoutText themeColor={themeColor} />
                <LogoWithText themeColor={themeColor} />
            </LogoInnerContainer>
        </LogoContainer>
    )
}

export default Logo
