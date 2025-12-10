# astro-dynamic-component

English | [简体中文](./README.zh-CN.md)

An Astro integration for dynamic component imports using glob patterns with client directive support.

[![npm version](https://badge.fury.io/js/astro-dynamic-component.svg)](https://www.npmjs.com/package/astro-dynamic-component)

## Why This Plugin?

In Astro, client directives require explicit imports for build-time analysis ([docs](https://docs.astro.build/en/reference/errors/no-matching-import/)):

```astro
---
// ❌ This fails - Astro can't analyze dynamic component
import VueComponent from "./components/X.vue";

const X = VueComponent;
---
<X client:load />
---
<Component client:load />
```

This plugin solves it by generating static imports from glob patterns while preserving client directives.

## Features

- 🎯 **Glob Imports** - Import multiple components with `*.vue`, `**/*.jsx` patterns
- ⚡ **Client Directives** - Full support for `load`, `idle`, `visible`, `only`, etc.
- 🔄 **Dynamic Rendering** - Switch components via props
- 📦 **Framework Agnostic** - Works with Vue, React, Svelte, Astro
- 🔧 **Path Aliases** - Supports tsconfig paths

## Installation

```bash
npm install astro-dynamic-component
```

## Quick Start

**1. Add to Astro config:**

```javascript
// astro.config.mjs
import dynamicComponent from 'astro-dynamic-component';

export default defineConfig({
  integrations: [dynamicComponent()]
});
```

**2. Import with `dc:` prefix:**

```astro
---
import Button from "dc:load:./components/buttons/*.vue";
---

<Button comp="PrimaryButton" text="Click me" />
<Button comp="SecondaryButton" text="Cancel" />
```

## Import Syntax

```
dc:[directive]:[pattern]
```

**Examples:**

```astro
---
// With client directive
import Btn from "dc:load:./buttons/*.vue";       // client:load
import Card from "dc:idle:./cards/*.jsx";         // client:idle
import Widget from "dc:visible:./widgets/*.svelte"; // client:visible

// Shorthand (defaults to client:load)
import Icon from "dc:./icons/*.astro";

// No client directive (SSR only)
import Layout from "dc::./layouts/*.astro";

// Path aliases
import Comp from "dc:load:@/components/*.vue";
---
```

**Note**: `.astro` components always ignore client directives (SSR only).

## Configuration

```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    dynamicComponent({
      defaultClientDirective: 'idle' // default: 'load'
    })
  ]
});
```

## How It Works

**Input:**
```astro
---
import Button from "dc:load:./components/buttons/*.vue";
---
```

**Generated virtual file** (`src/_generate/_virtual_dc_abc123.astro`):
```astro
---
import Com_1 from "../components/buttons/PrimaryButton.vue";
import Com_2 from "../components/buttons/SecondaryButton.vue";

interface Props {
  comp: "PrimaryButton" | "SecondaryButton";
  [key: string]: any;
}

const { comp, ...rest } = Astro.props;
---

{ comp === "PrimaryButton" && <Com_1 client:load {...rest} /> }
{ comp === "SecondaryButton" && <Com_2 client:load {...rest} /> }
```

## Component Naming

The `comp` prop matches the file path relative to the glob base (without extension):

```
Pattern: dc:load:./components/buttons/*.vue
File:    ./components/buttons/PrimaryButton.vue
→ comp="PrimaryButton"

Pattern: dc:load:./components/**/*.vue
File:    ./components/forms/inputs/TextInput.vue
→ comp="forms/inputs/TextInput"
```

## Examples

**Icon Library:**
```astro
---
import Icon from "dc:load:./icons/*.astro";
---
<Icon comp="home" /><Icon comp="user" /><Icon comp="settings" />
```

**Mixed Frameworks:**
```astro
---
import VueComp from "dc:only=vue:./vue-components/*.vue";
import ReactComp from "dc:only=react:./react-components/*.jsx";
---
<VueComp comp="Counter" />
<ReactComp comp="DatePicker" />
```

**Dynamic Dashboard:**
```astro
---
import Widget from "dc:visible:./widgets/*.svelte";
const widgets = ['SalesChart', 'UserStats', 'Orders'];
---
{widgets.map(name => <Widget comp={name} />)}
```

## Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Then use:
```astro
---
import Button from "dc:load:@/components/buttons/*.vue";
---
```

## Client Directives

| Directive | Format | Result |
|-----------|--------|--------|
| `load` (default) | `dc:load:./path/*.*` or `dc:./path/*.*` | `client:load` |
| `idle` | `dc:idle:./path/*.*` | `client:idle` |
| `visible` | `dc:visible:./path/*.*` | `client:visible` |
| `media` | `dc:media=(min-width: 768px):./path/*.*` | `client:media="..."` |
| `only` | `dc:only=vue:./path/*.vue` | `client:only="vue"` |
| SSR | `dc::./path/*.astro` | No directive |

## Performance

Files matching the same glob pattern share a single generated file, reducing bundle size:

```astro
---
// Both use the same virtual file
import BtnA from "dc:load:./buttons/*.vue";
import BtnB from "dc:idle:./buttons/*.vue";
---
```

## Troubleshooting

**No files matched:**
- Check glob pattern syntax
- Verify file extensions match
- Ensure files exist at the path

**Component not rendering:**
- Verify `comp` prop matches filename (without extension)
- For nested paths, include directory: `comp="subdir/Component"`

## Requirements

- **Astro**: `^4.0.0` or `^5.0.0`
- **Node.js**: `>=18.0.0`

## License

MIT

## Links

- [GitHub](https://github.com/shjyh/astro-dynamic-component)
- [NPM](https://www.npmjs.com/package/astro-dynamic-component)
- [Issues](https://github.com/shjyh/astro-dynamic-component/issues)
