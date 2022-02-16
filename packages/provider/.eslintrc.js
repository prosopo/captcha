// Copyright 2017-2020 @polkadot/dev authors & contributors
// SPDX-License-Identifier: Apache-2.0

// ordering here important (at least from a rule maintenance pov)
/* eslint-disable sort-keys */

require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    env: {
        browser: true,
        jest: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        require.resolve('eslint-config-standard'),
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/restrict-plus-operands': 'off',
                '@typescript-eslint/restrict-template-expressions': 'off',
                'indent': ['error', 4]
            }
        },
        {
            files: ["*.test.ts", "*.spec.ts"],
            rules: {
                'no-unused-expressions': 'off',
            }
        }
    ],
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
        project: "./tsconfig.json",
    },
    plugins: ['@typescript-eslint', 'import'],
    settings: {
        'import/extensions': ['.js', '.ts', '.tsx'],
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx']
        },
        'import/resolver': require.resolve('eslint-import-resolver-node')
    }
};
