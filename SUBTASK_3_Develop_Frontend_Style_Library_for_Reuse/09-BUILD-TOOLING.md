09. BUILD AND TOOLING STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

TYPESCRIPT CONFIGURATION

Production tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "outDir": "./dist",
    "rootDir": "./src",
    
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx"
  ]
}
```

TypeScript Config Standards:
- Enable all strict type checking
- Generate declarations and source maps
- Use ES2020 target minimum
- Enable path aliases
- Exclude test files from build
- Use isolatedModules for better build performance

================================================================================

ROLLUP CONFIGURATION

Production rollup.config.js

```javascript
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import { terser } from 'rollup-plugin-terser'
import filesize from 'rollup-plugin-filesize'

const isProduction = process.env.NODE_ENV === 'production'

export default {
  input: 'src/index.ts',
  
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named'
    }
  ],
  
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime'
  ],
  
  plugins: [
    peerDepsExternal(),
    resolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      declarationMap: true,
      exclude: ['**/*.test.ts', '**/*.test.tsx']
    }),
    postcss({
      extract: 'styles.css',
      minimize: isProduction,
      sourceMap: true,
      modules: false,
      use: ['sass']
    }),
    isProduction && terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }),
    filesize()
  ].filter(Boolean),
  
  onwarn(warning, warn) {
    // Suppress certain warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return
    warn(warning)
  }
}
```

Rollup Standards:
- Generate both CJS and ESM outputs
- Externalize peer dependencies
- Extract CSS separately
- Minify in production
- Generate source maps
- Show bundle sizes
- Suppress unnecessary warnings

================================================================================

ESLINT CONFIGURATION

Production .eslintrc.json

```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 2021,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "jsx-a11y"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "ignorePatterns": ["dist", "node_modules", "*.config.js"]
}
```

ESLint Standards:
- Use TypeScript ESLint parser
- Enable React and accessibility plugins
- Enforce no-any rule
- Warn on console.log
- Enforce modern JavaScript (no var, prefer const)
- Ignore build outputs
- Auto-detect React version

================================================================================

PRETTIER CONFIGURATION

Production .prettierrc

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

Prettier Standards:
- No semicolons
- Single quotes
- ES5 trailing commas
- 2 space indentation
- 80 character line width
- Unix line endings

Integration with ESLint

```bash
# Install
npm install --save-dev eslint-config-prettier eslint-plugin-prettier

# Add to .eslintrc.json
{
  "extends": [
    ...
    "plugin:prettier/recommended"
  ]
}
```

================================================================================

HUSKY GIT HOOKS

Pre-commit Hook Setup

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky-init

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint-staged"
```

lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  },
  "scripts": {
    "lint-staged": "lint-staged"
  }
}
```

Pre-push Hook

```bash
# Add pre-push hook
npx husky add .husky/pre-push "npm test"
```

Git Hook Standards:
- Run linting on pre-commit
- Run tests on pre-push
- Fix auto-fixable issues
- Prevent bad commits
- Keep hooks fast (< 10 seconds)

================================================================================

CI/CD PIPELINE

GitHub Actions Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build package
        run: npm run build
      
      - name: Check bundle size
        run: npm run test:size
```

Publish Workflow

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build package
        run: npm run build
      
      - name: Publish to NPM
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

CI/CD Standards:
- Run on every push and PR
- Test on multiple Node versions
- Run linting and type checking
- Upload coverage reports
- Auto-publish on release
- Use npm ci for reproducible builds
- Cache dependencies for speed

================================================================================

PACKAGE SCRIPTS

Standard Scripts

```json
{
  "scripts": {
    "dev": "rollup -c --watch",
    "build": "rollup -c",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:size": "bundlesize",
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "prepublishOnly": "npm run lint && npm run type-check && npm test && npm run build",
    "clean": "rm -rf dist",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

Script Standards:
- Use consistent naming
- Include watch modes for development
- Run checks before publish
- Provide clean script
- Include Storybook scripts
- Document custom scripts in README

================================================================================

DEVELOPMENT ENVIRONMENT

VS Code Configuration

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "node_modules": true,
    "dist": true
  }
}
```

Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss"
  ]
}
```

EditorConfig

```ini
# .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

Development Environment Standards:
- Configure VS Code settings
- Recommend essential extensions
- Use EditorConfig for consistency
- Enable format on save
- Configure auto-fix on save

================================================================================

DEPENDENCY MANAGEMENT

Dependency Update Strategy

```bash
# Check for outdated packages
npm outdated

# Update patch versions
npm update

# Update specific package
npm update package-name

# Update to latest (including major)
npm install package-name@latest

# Interactive update
npx npm-check-updates -i
```

Security Audits

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force
```

Dependency Update Standards:
- Review dependencies monthly
- Update patch versions automatically
- Review minor updates carefully
- Test major updates thoroughly
- Run security audits regularly
- Document breaking changes

Package Lock Management

```bash
# Use npm ci in CI/CD
npm ci

# Update package-lock.json
npm install

# Verify lock file
npm ls
```

Standards:
- Commit package-lock.json
- Use npm ci in CI/CD for reproducibility
- Never edit package-lock.json manually
- Update lock file when adding/removing packages

================================================================================

PERFORMANCE MONITORING

Bundle Size Monitoring

```json
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/index.js",
      "maxSize": "100 kB",
      "compression": "gzip"
    },
    {
      "path": "./dist/index.esm.js",
      "maxSize": "100 kB",
      "compression": "gzip"
    }
  ]
}
```

Bundle Analysis

```bash
# Install analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to rollup.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [
    visualizer({
      filename: 'bundle-stats.html',
      open: true
    })
  ]
}
```

Performance Standards:
- Monitor bundle sizes
- Set size limits
- Analyze bundle composition
- Optimize large dependencies
- Track size changes in CI

================================================================================

KEY TAKEAWAYS

1. Configure TypeScript with strict settings
2. Use Rollup for optimal bundling
3. Enforce code quality with ESLint
4. Format code with Prettier
5. Use Git hooks to prevent bad commits
6. Automate testing and publishing with CI/CD
7. Monitor bundle sizes
8. Keep dependencies updated
9. Run security audits regularly
10. Configure development environment for consistency

================================================================================

Previous: [← 08 - Package Distribution Standards](./08-PACKAGE-DISTRIBUTION.md)  
Next: [10 - API Design Standards](./10-API-DESIGN.md) →

