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
import { type HandleOptions, handle } from 'i18next-http-middleware'

import i18n from '../i18n.js'

function i18nMiddleware(options: HandleOptions): ReturnType<typeof handle> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore not sure how to fix this
    return handle(i18n, { ...options })
}

export default i18nMiddleware
