// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { default as styled } from "@emotion/styled";
import { WIDGET_OUTER_HEIGHT } from "./WidgetConstants.js";

export const ContainerDiv = styled.div`
    container-type: size;
    display: flex;
    flex-direction: column;
    height: ${WIDGET_OUTER_HEIGHT}px;
`;

export const WidthBasedStylesDiv = styled.div`
    max-height: 100%;
    min-width: 100%;
    overflow: hidden;
    height: ${WIDGET_OUTER_HEIGHT}px;
    width: 100%;
    display: grid;
`;
