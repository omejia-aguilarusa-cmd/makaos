import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

// Flat ESLint config for the Maka OS React app.
// The data file and the original design HTML artifacts are intentionally
// excluded — they're generated/imported, not hand-edited source.
export default [
  { ignores: ['dist/**', 'node_modules/**', 'design/**', 'public/**', 'scripts/**', 'src/lib/macPainters.js'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The app uses the classic React import everywhere and inline JSX text
      // with punctuation; these stylistic rules add noise without value here.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      // Intentional empty catches guard localStorage / focus / optional bridges.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { args: 'after-used', caughtErrors: 'none', varsIgnorePattern: '^(React|_)' }],
    },
  },
  {
    // Serverless API functions run on Node, not in the browser.
    files: ['api/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
