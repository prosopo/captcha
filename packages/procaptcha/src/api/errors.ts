// Copyright 2021-2023 Prosopo (UK) Ltd.
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
export class NoExtensionsFoundError extends Error {
    constructor(msg?: string) {
        super(msg || 'No extensions found')
    }
}

export class AccountCreationUnsupportedError extends Error {
    constructor(msg?: string) {
        super(msg || 'Account creation is not supported')
    }
}

export class AccountNotFoundError extends Error {
    constructor(msg?: string) {
        super(msg || 'No account found')
    }
}

export class ExtensionNotFoundError extends Error {
    constructor(msg?: string) {
        super(msg || 'No extensions found')
    }
}

export class ExpiredError extends Error {
    constructor(msg?: string) {
        super(msg || 'The challenge has expired')
    }
}
