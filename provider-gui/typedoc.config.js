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
module.exports = {
    entryPoints: [
        'app/**/*.ts',
        'app/**/*.tsx',
        'app/**/*.js',
        'app/**/*.jsx',
        'app/**/*.json',
        'components/**/*.ts',
        'components/**/*.tsx',
        'components/**/*.js',
        'components/**/*.jsx',
        'components/**/*.json',
        'contexts/**/*.ts',
        'contexts/**/*.tsx',
        'contexts/**/*.js',
        'contexts/**/*.jsx',
        'contexts/**/*.json',
        'mocks/**/*.ts',
        'mocks/**/*.tsx',
        'mocks/**/*.js',
        'mocks/**/*.jsx',
        'mocks/**/*.json',
        'services/**/*.ts',
        'services/**/*.tsx',
        'services/**/*.js',
        'services/**/*.jsx',
        'services/**/*.json',
        'types/**/*.ts',
        'types/**/*.tsx',
        'types/**/*.js',
        'types/**/*.jsx',
        'types/**/*.json',
    ],
    includes: ['app', 'components', 'contexts', 'mocks', 'services', 'types'],
    extends: '../typedoc.base.config.js',
}
