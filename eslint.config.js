import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierPlugin from 'eslint-plugin-prettier'
import globals from 'globals'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']
const typeCheckedTsConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: config.files ?? tsFiles,
}))

export default [
  js.configs.recommended,

  ...typeCheckedTsConfigs,

  ...compat.config(reactPlugin.configs.recommended),
  ...compat.config(reactHooks.configs.recommended),

  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: ['server/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.server.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ['**/*.{ts,tsx}'],

    plugins: {
      prettier: prettierPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
    },

    settings: {
      react: { version: 'detect' },
    },

    rules: {
      semi: ['error', 'never'],

      // Express 4 route handlers and passport callbacks are async by convention
      // (they own their try/catch + next(err)); passing them where a void-returning
      // handler is expected is safe here, not a bug. Same for async React event
      // handlers (onClick). We keep the rest of no-misused-promises active.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      indent: ['error', 2, { SwitchCase: 1 }],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-tabs': 'error',
      'no-trailing-spaces': 'error',

      'react/jsx-first-prop-new-line': ['error', 'multiline'],
      'react/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
      'react/jsx-closing-bracket-location': ['error', 'tag-aligned'],

      'prettier/prettier': [
        'error',
        {
          semi: false,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          endOfLine: 'lf',
          trailingComma: 'es5',
          printWidth: 100,
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      ...reactHooks.configs.recommended.rules,
    },
  },

  {
    ignores: [
      'dist/',
      'dist-server/',
      'build/',
      'node_modules/',
      '.vite/',
      'coverage/',
      'drizzle/',
      'eslint.config.js',
      'prettier.config.*',
      'vite.config.*',
      'drizzle.config.*',
      'tsconfig.*.json',
    ],
  },
]
