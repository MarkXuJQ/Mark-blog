import { createRequire } from 'module'
const require = createRequire(import.meta.url)

/** @type {import("prettier").Config} */
export default {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  plugins: [require.resolve('prettier-plugin-tailwindcss')],
}
