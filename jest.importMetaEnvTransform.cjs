// Vite exposes env vars via `import.meta.env.X`, which is valid ESM syntax
// but has no meaning under Jest's CommonJS test runtime — ts-jest can't even
// type-check it (TS1343). Rewrite `import.meta.env.X` -> `process.env.X`
// before handing the source to ts-jest, so files that use Vite env vars
// (logger.ts, sentry.ts, posthog.ts, stripe.ts, etc.) are testable without
// changing how they run in the real Vite-built app.
const { TsJestTransformer } = require('ts-jest');

const tsJestTransformer = new TsJestTransformer({
  tsconfig: {
    jsx: 'react-jsx',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*'],
    },
    types: ['jest', 'node', '@testing-library/jest-dom'],
  },
});

module.exports = {
  process(sourceText, sourcePath, options) {
    const rewritten = sourceText.replace(
      /import\.meta\.env\.(\w+)/g,
      'process.env.$1'
    );
    return tsJestTransformer.process(rewritten, sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    return tsJestTransformer.getCacheKey(sourceText, sourcePath, options);
  },
};
