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
'use client'

import { Box, type Theme, useTheme } from '@mui/material'
import type { SxProps } from '@mui/system'

interface Props {
    height: number
    width: number
    component?: React.ElementType
    sx?: SxProps<Theme>
}

const Spacer = (props: Props) => {
    const theme = useTheme()

    return (
        <Box
            component={props.component}
            sx={{ height: theme.spacing(props.height), width: theme.spacing(props.width), ...props.sx }}
        />
    )
}

Spacer.defaultProps = {
    height: 1,
    width: 0,
    component: 'div',
}

export default Spacer
