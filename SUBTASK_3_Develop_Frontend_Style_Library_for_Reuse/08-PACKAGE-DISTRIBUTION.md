08. PACKAGE DISTRIBUTION STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

PACKAGE NAMING CONVENTIONS

NPM Package Names

```
Organization Scope: @cbo
Package Names: kebab-case

Examples:
@cbo/component-library
@cbo/style-utilities
@cbo/utils
@cbo/icons
```

Naming Standards:
- Use organization scope (@cbo)
- Use kebab-case for package names
- Keep names descriptive but concise
- Avoid redundant words (library, package)
- Use consistent prefixes within organization

================================================================================

SEMANTIC VERSIONING

Version Format: MAJOR.MINOR.PATCH

```
Examples:
1.0.0 - Initial release
1.1.0 - New features (backwards compatible)
1.1.1 - Bug fixes (backwards compatible)
2.0.0 - Breaking changes
```

Version Increment Rules

```
MAJOR (x.0.0):
- Breaking API changes
- Removed features
- Changed component behavior significantly
- Renamed props

Examples:
- Renamed StatCard prop from 'label' to 'title'
- Removed deprecated OldModal component
- Changed LineChart data structure

MINOR (1.x.0):
- New features (backwards compatible)
- New components
- New props (with defaults)
- Deprecations (with warnings)

Examples:
- Added ProgressBarStatCard component
- Added new 'icon' prop to Button
- Deprecated OldModal (still works, shows warning)

PATCH (1.0.x):
- Bug fixes
- Performance improvements
- Documentation updates
- Dependency updates (non-breaking)

Examples:
- Fixed StatCard comparison display bug
- Improved chart rendering performance
- Updated README with new examples
```

Versioning Standards:
- Follow Semantic Versioning 2.0.0
- Document all breaking changes
- Provide migration guides for major versions
- Use pre-release versions for testing (1.0.0-alpha.1)
- Never delete published versions

================================================================================

PACKAGE.JSON CONFIGURATION

Standard Package.json

```json
{
  "name": "@cbo/component-library",
  "version": "1.2.0",
  "description": "Production-ready React component library for business analytics dashboards",
  "keywords": [
    "react",
    "components",
    "ui",
    "dashboard",
    "analytics",
    "charts",
    "kpi"
  ],
  "author": "CBO Team <cbo@company.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/cbo/component-library.git"
  },
  "bugs": {
    "url": "https://github.com/cbo/component-library/issues"
  },
  "homepage": "https://github.com/cbo/component-library#readme",
  
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css",
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.esm.js",
      "require": "./dist/utils/index.js"
    }
  },
  
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  
  "sideEffects": false,
  
  "scripts": {
    "build": "rollup -c",
    "test": "jest",
    "lint": "eslint src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm test"
  },
  
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  
  "dependencies": {
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0"
  },
  
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "rollup": "^4.9.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

Package.json Standards:
- Include all metadata fields
- Provide multiple entry points (main, module, types)
- Use exports field for subpath exports
- List only necessary files
- Set sideEffects to false for tree-shaking
- Include prepublishOnly script
- Separate peer/regular/dev dependencies

================================================================================

NPM PUBLISHING STANDARDS

Publishing Checklist

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Update changelog
# Edit CHANGELOG.md manually

# 3. Run tests
npm test

# 4. Build package
npm run build

# 5. Check package contents
npm pack --dry-run

# 6. Publish to npm
npm publish --access public

# 7. Create git tag
git push origin v1.2.0

# 8. Create GitHub release
# Create release on GitHub with changelog
```

Publishing Script

```javascript
// scripts/publish.js
const { execSync } = require('child_process')
const fs = require('fs')

function publish(versionType) {
  console.log(`Publishing ${versionType} version...`)
  
  // Run tests
  console.log('Running tests...')
  execSync('npm test', { stdio: 'inherit' })
  
  // Build
  console.log('Building package...')
  execSync('npm run build', { stdio: 'inherit' })
  
  // Update version
  console.log(`Updating ${versionType} version...`)
  execSync(`npm version ${versionType}`, { stdio: 'inherit' })
  
  // Get new version
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
  const newVersion = packageJson.version
  
  // Publish
  console.log(`Publishing v${newVersion}...`)
  execSync('npm publish --access public', { stdio: 'inherit' })
  
  // Push tags
  console.log('Pushing tags...')
  execSync('git push --follow-tags', { stdio: 'inherit' })
  
  console.log(`✓ Successfully published v${newVersion}`)
}

const versionType = process.argv[2] || 'patch'
publish(versionType)
```

Publishing Standards:
- Always run tests before publishing
- Update changelog before publishing
- Use npm version to update version
- Publish with --access public for scoped packages
- Create git tags for releases
- Create GitHub releases with notes

================================================================================

PACKAGE REGISTRY OPTIONS

Option 1: Public NPM Registry

```bash
# Configure .npmrc
//registry.npmjs.org/:_authToken=${NPM_TOKEN}

# Publish
npm publish --access public
```

Pros:
- Free for public packages
- Wide availability
- Good for open source

Cons:
- Public access only
- No private packages (without paid plan)

Option 2: Private NPM Registry

```bash
# Configure .npmrc
@cbo:registry=https://npm.company.com/
//npm.company.com/:_authToken=${NPM_TOKEN}

# Publish
npm publish
```

Pros:
- Private packages
- Internal control
- Better security

Cons:
- Requires infrastructure
- Maintenance overhead

Option 3: GitHub Packages

```bash
# Configure .npmrc
@cbo:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}

# Publish
npm publish
```

Pros:
- Integrated with GitHub
- Free for public repos
- Good access control

Cons:
- Requires GitHub authentication
- Limited to GitHub users

Option 4: Verdaccio (Self-hosted)

```bash
# Install Verdaccio
npm install -g verdaccio

# Start server
verdaccio

# Configure .npmrc
registry=http://localhost:4873/

# Publish
npm publish
```

Pros:
- Full control
- Can cache public packages
- Free and open source

Cons:
- Self-hosted maintenance
- Need server infrastructure

Registry Selection Standards:
- Use public NPM for open source libraries
- Use private registry for internal libraries
- Consider GitHub Packages for GitHub-centric teams
- Use Verdaccio for local development and testing

================================================================================

BUILD OUTPUT STANDARDS

Distribution Files Structure

```
dist/
├── index.js                # CommonJS build
├── index.js.map            # Source map
├── index.esm.js            # ES Module build
├── index.esm.js.map        # Source map
├── index.d.ts              # TypeScript declarations
├── index.d.ts.map          # Declaration map
├── styles.css              # Bundled styles
├── styles.css.map          # Source map
│
├── components/             # Component modules (optional)
│   ├── StatCard.js
│   ├── StatCard.d.ts
│   └── ...
│
└── utils/                  # Utility modules (optional)
    ├── formatters.js
    ├── formatters.d.ts
    └── ...
```

Build Configuration

```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import postcss from 'rollup-plugin-postcss'
import { terser } from 'rollup-plugin-terser'

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
  external: ['react', 'react-dom'],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      declaration: true,
      declarationDir: './dist',
      declarationMap: true
    }),
    postcss({
      extract: 'styles.css',
      minimize: true,
      sourceMap: true
    }),
    terser()
  ]
}
```

Build Output Standards:
- Generate both CommonJS and ES Module builds
- Include TypeScript declarations
- Generate source maps
- Minify production builds
- Extract CSS separately
- Support tree-shaking (sideEffects: false)
- Externalize peer dependencies

================================================================================

PACKAGE SIZE OPTIMIZATION

Bundle Size Analysis

```bash
# Install bundlesize
npm install --save-dev bundlesize

# Add to package.json
{
  "scripts": {
    "test:size": "bundlesize"
  },
  "bundlesize": [
    {
      "path": "./dist/index.js",
      "maxSize": "100 kB"
    },
    {
      "path": "./dist/index.esm.js",
      "maxSize": "100 kB"
    },
    {
      "path": "./dist/styles.css",
      "maxSize": "50 kB"
    }
  ]
}

# Run size check
npm run test:size
```

Size Optimization Techniques

```typescript
// 1. Tree-shakeable exports
// BAD: Default export
export default { StatCard, LineChart, BarChart }

// GOOD: Named exports
export { StatCard } from './StatCard'
export { LineChart } from './LineChart'
export { BarChart } from './BarChart'

// 2. Lazy loading
// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))

// 3. External dependencies
// Don't bundle peer dependencies
external: ['react', 'react-dom', 'recharts']

// 4. Code splitting
// Split large modules
export { formatCurrency } from './formatters/currency'
export { formatDate } from './formatters/date'
```

Size Optimization Standards:
- Keep total bundle < 200 kB
- Use named exports for tree-shaking
- Externalize peer dependencies
- Code split large modules
- Monitor bundle size in CI
- Use dynamic imports for optional features

================================================================================

PRE-RELEASE VERSIONS

Pre-release Version Format

```
Syntax: MAJOR.MINOR.PATCH-PRERELEASE.NUMBER

Examples:
1.0.0-alpha.1    # Alpha release
1.0.0-alpha.2    # Alpha release
1.0.0-beta.1     # Beta release
1.0.0-beta.2     # Beta release
1.0.0-rc.1       # Release candidate
1.0.0-rc.2       # Release candidate
1.0.0            # Stable release
```

Publishing Pre-releases

```bash
# Publish alpha
npm version prerelease --preid=alpha
npm publish --tag alpha

# Publish beta
npm version prerelease --preid=beta
npm publish --tag beta

# Publish release candidate
npm version prerelease --preid=rc
npm publish --tag rc

# Publish stable
npm version patch
npm publish
```

Installing Pre-releases

```bash
# Install specific pre-release
npm install @cbo/component-library@1.0.0-beta.1

# Install latest alpha
npm install @cbo/component-library@alpha

# Install latest beta
npm install @cbo/component-library@beta
```

Pre-release Standards:
- Use alpha for early testing
- Use beta for feature-complete testing
- Use rc for final testing before release
- Document breaking changes in pre-releases
- Don't use pre-releases in production
- Clean up old pre-releases

================================================================================

DEPRECATION STRATEGY

Deprecation Process

```typescript
// 1. Mark as deprecated in code
/**
 * @deprecated Use NewModal instead. Will be removed in v3.0.0
 */
export const OldModal = (props: OldModalProps) => {
  // Show deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'OldModal is deprecated and will be removed in v3.0.0. ' +
      'Please use NewModal instead.'
    )
  }
  
  return <div>...</div>
}

// 2. Provide replacement
export const NewModal = (props: NewModalProps) => {
  return <div>...</div>
}
```

Deprecation Timeline

```
Version 1.5.0 - Mark as deprecated
- Add deprecation warning
- Update documentation
- Provide migration guide

Version 2.0.0 - Still available (major version)
- Keep deprecated feature
- Increase warning visibility
- Update examples to use new API

Version 3.0.0 - Remove deprecated feature
- Complete removal
- Update changelog
- Provide automated migration tool if possible
```

Deprecation Standards:
- Announce deprecations early
- Provide clear replacement
- Keep deprecated features for at least one major version
- Show warnings in development only
- Document in changelog
- Provide migration guides

================================================================================

KEY TAKEAWAYS

1. Use @organization/package-name format
2. Follow Semantic Versioning strictly
3. Configure package.json completely
4. Test before every publish
5. Generate both CJS and ESM builds
6. Include TypeScript declarations
7. Monitor and optimize bundle size
8. Use pre-release versions for testing
9. Deprecate features gradually
10. Document all releases in changelog

================================================================================

Previous: [← 07 - Documentation Standards](./07-DOCUMENTATION-STANDARDS.md)  
Next: [09 - Build and Tooling Standards](./09-BUILD-TOOLING.md) →

