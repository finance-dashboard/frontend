module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: ['standard', 'react-app', 'react-app/jest', 'plugin:react/recommended', 'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: ['react', '@typescript-eslint', 'prettier'],
  rules: {
    'no-use-before-define': 'off',
    'prettier/prettier': 'error'
  }
}
