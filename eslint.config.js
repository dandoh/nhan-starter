//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      // Disable import order rules
      'import/order': 'off',
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',
      'sort/imports': 'off',
      'sort-imports': 'off',
    },
  },
]
