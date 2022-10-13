module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": ["unused-imports", "@typescript-eslint"],
    "rules": {
        "no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
            "warn",
            {
                "vars": "all",
                "varsIgnorePattern": "^_",
                "args": "after-used",
                "argsIgnorePattern": "^_"
            }
        ],
        "indent": ["error", 4],
        "@typescript-eslint/ban-ts-comment": "warn",
        "no-undef": "warn",
        "@typescript-eslint/no-var-requires": "warn",
        "@typescript-eslint/no-this-alias": "warn",
        "sort-imports": [
            "error",
            {
                "ignoreDeclarationSort": true
            }
        ]
    },
}
