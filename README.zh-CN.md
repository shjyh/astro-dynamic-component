# astro-dynamic-component

[English](./README.md) | 简体中文

一个支持 glob 模式和客户端指令的 Astro 动态组件导入集成。

[![npm version](https://badge.fury.io/js/astro-dynamic-component.svg)](https://www.npmjs.com/package/astro-dynamic-component)

## 为什么需要这个插件？

在 Astro 中，客户端指令需要显式导入以便构建时分析（[文档](https://docs.astro.build/en/reference/errors/no-matching-import/)）：

```astro
---
// ❌ 失败 - Astro 无法分析动态组件
import VueComponent from "./components/X.vue";

const X = VueComponent;
---
<X client:load />
```

本插件通过从 glob 模式生成静态导入来解决此问题，同时保留客户端指令。

## 特性

- 🎯 **Glob 导入** - 使用 `*.vue`、`**/*.jsx` 等模式导入多个组件
- ⚡ **客户端指令** - 完整支持 `load`、`idle`、`visible`、`only` 等
- 🔄 **动态渲染** - 通过 props 切换组件
- 📦 **框架无关** - 支持 Vue、React、Svelte、Astro
- 🔧 **路径别名** - 支持tsconfig paths

## 安装

```bash
npm install astro-dynamic-component
```

## 快速开始

**1. 添加到 Astro 配置：**

```javascript
// astro.config.mjs
import dynamicComponent from 'astro-dynamic-component';

export default defineConfig({
  integrations: [dynamicComponent()]
});
```

**2. 使用 `dc:` 前缀导入：**

```astro
---
import Button from "dc:load:./components/buttons/*.vue";
---

<Button comp="PrimaryButton" text="点击我" />
<Button comp="SecondaryButton" text="取消" />
```

## 导入语法

```
dc:[指令]:[模式]
```

**示例：**

```astro
---
// 带客户端指令
import Btn from "dc:load:./buttons/*.vue";       // client:load
import Card from "dc:idle:./cards/*.jsx";         // client:idle
import Widget from "dc:visible:./widgets/*.svelte"; // client:visible

// 简写（默认 client:load）
import Icon from "dc:./icons/*.astro";

// 无客户端指令（仅 SSR）
import Layout from "dc::./layouts/*.astro";

// 路径别名
import Comp from "dc:load:@/components/*.vue";
---
```

**注意**：`.astro` 组件始终忽略客户端指令（仅 SSR）。

## 配置

```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    dynamicComponent({
      defaultClientDirective: 'idle' // 默认: 'load'
    })
  ]
});
```

## 工作原理

**输入：**
```astro
---
import Button from "dc:load:./components/buttons/*.vue";
---
```

**生成的虚拟文件**（`src/_generate/_virtual_dc_abc123.astro`）：
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

## 组件命名

`comp` 属性值匹配相对于 glob 基础目录的文件路径（不含扩展名）：

```
模式：dc:load:./components/buttons/*.vue
文件：./components/buttons/PrimaryButton.vue
→ comp="PrimaryButton"

模式：dc:load:./components/**/*.vue
文件：./components/forms/inputs/TextInput.vue
→ comp="forms/inputs/TextInput"
```

## 示例

**图标库：**
```astro
---
import Icon from "dc:load:./icons/*.astro";
---
<Icon comp="home" /><Icon comp="user" /><Icon comp="settings" />
```

**混合框架：**
```astro
---
import VueComp from "dc:only=vue:./vue-components/*.vue";
import ReactComp from "dc:only=react:./react-components/*.jsx";
---
<VueComp comp="Counter" />
<ReactComp comp="DatePicker" />
```

**动态仪表盘：**
```astro
---
import Widget from "dc:visible:./widgets/*.svelte";
const widgets = ['SalesChart', 'UserStats', 'Orders'];
---
{widgets.map(name => <Widget comp={name} />)}
```

## 路径别名

在 `tsconfig.json` 中配置：

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

然后使用：
```astro
---
import Button from "dc:load:@/components/buttons/*.vue";
---
```

## 客户端指令

| 指令 | 格式 | 结果 |
|------|------|------|
| `load`（默认） | `dc:load:./path/*.*` 或 `dc:./path/*.*` | `client:load` |
| `idle` | `dc:idle:./path/*.*` | `client:idle` |
| `visible` | `dc:visible:./path/*.*` | `client:visible` |
| `media` | `dc:media=(min-width: 768px):./path/*.*` | `client:media="..."` |
| `only` | `dc:only=vue:./path/*.vue` | `client:only="vue"` |
| SSR | `dc::./path/*.astro` | 无指令 |

## 性能优化

匹配相同 glob 模式的文件共享单个生成文件，减少打包体积：

```astro
---
// 两者使用相同的虚拟文件
import BtnA from "dc:load:./buttons/*.vue";
import BtnB from "dc:idle:./buttons/*.vue";
---
```

## 故障排除

**未匹配到文件：**
- 检查 glob 模式语法
- 验证文件扩展名匹配
- 确保文件存在于路径

**组件未渲染：**
- 验证 `comp` 属性与文件名匹配（不含扩展名）
- 嵌套路径需包含目录：`comp="subdir/Component"`

## 系统要求

- **Astro**: `^4.0.0` 或 `^5.0.0`
- **Node.js**: `>=18.0.0`

## 许可证

MIT

## 相关链接

- [GitHub](https://github.com/shjyh/astro-dynamic-component)
- [NPM](https://www.npmjs.com/package/astro-dynamic-component)
- [问题反馈](https://github.com/shjyh/astro-dynamic-component/issues)
