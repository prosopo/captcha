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
import { WIDGET_OUTER_HEIGHT } from './WidgetConstants.js'
import { default as styled } from '@emotion/styled'

export const ContainerDiv = styled.div`
    container-type: inline-size;
`

export const WidthBasedStylesDiv = styled.div`
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
    height: ${WIDGET_OUTER_HEIGHT}px;
    @container (max-width: 243px) {
        #logo-without-text {
            display: none;
        }

        #logo-with-text {
            display: none;
        }
    }
    @container (max-width: 339px) {
        #logo-without-text {
            display: inherit;
        }

        #logo-with-text {
            display: none;
        }
    }
    @container (min-width: 340px) {
        #logo-without-text {
            display: none;
        }

        #logo-with-text {
            display: inherit;
        }
    }
`
