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
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "indent": ["error", 4],
        "@typescript-eslint/ban-ts-comment": "warn",
        "no-undef": "warn",
        "@typescript-eslint/no-var-requires": "warn",
        "@typescript-eslint/no-this-alias": "warn"
    }
}
