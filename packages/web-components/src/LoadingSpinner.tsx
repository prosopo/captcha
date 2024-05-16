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
import { darkTheme, lightTheme } from './theme.js'
import { useMemo } from 'react'
import styled from '@emotion/styled'

export interface LoadingSpinnerComponentProps {
    themeColor: 'light' | 'dark'
}

export const LoadingSpinner = ({ themeColor }: LoadingSpinnerComponentProps) => {
    const theme = useMemo(() => (themeColor === 'light' ? lightTheme : darkTheme), [themeColor])
    const StyledDiv = styled.div`
        margin-top: 0;
        margin-left: 15px;
        margin-right: 15px;
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
