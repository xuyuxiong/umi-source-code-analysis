# 整体架构

## 分层架构设计

UmiJS 采用清晰的分层架构设计，各层职责明确、依赖关系单向。这种设计使得框架具有良好的可维护性和可扩展性。

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (Application)                      │
│                         src/pages/*                             │
│                         src/app.ts                              │
│                         .umirc.ts                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      运行时层 (Runtime)                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              @umijs/renderer-react                      │   │
│   │           (React 渲染、客户端/服务端渲染)                 │   │
│   └─────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              运行时插件 (Runtime Plugins)                │   │
│   │          (定义在 src/app.ts 中，浏览器端执行)              │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     编译时层 (Compile Time)                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              @umijs/preset-umi                          │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │   │
│   │  │ tmpFiles   │ │  webpack   │ │    vite    │           │   │
│   │  │ (临时文件)  │ │  (打包器)  │ │  (打包器)  │           │   │
│   │  └────────────┘ └────────────┘ └────────────┘           │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │   │
│   │  │   mfsu     │ │    ssr     │ │   mock     │           │   │
│   │  │  (加速)    │ │ (服务端渲染)│ │ (模拟数据) │           │   │
│   │  └────────────┘ └────────────┘ └────────────┘           │   │
│   └─────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              编译时插件 (Compile Plugins)                │   │
│   │         (定义在 plugins/*.ts 中，Node.js 执行)            │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      核心层 (Core Layer)                         │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  @umijs/core                            │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │   │
│   │  │  Service   │ │ PluginAPI  │ │   Config   │           │   │
│   │  │ (核心服务)  │ │ (插件 API)  │ │ (配置系统)  │           │   │
│   │  └────────────┘ └────────────┘ └────────────┘           │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │   │
│   │  │   Route    │ │  Command   │ │  Generator │           │   │
│   │  │ (路由系统)  │ │ (命令系统)  │ │ (生成器)   │           │   │
│   │  └────────────┘ └────────────┘ └────────────┘           │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 请求生命周期

### 开发模式生命周期

```
┌─────────────────────────────────────────────────────────────────┐
│                      开发模式启动流程                            │
└─────────────────────────────────────────────────────────────────┘

  1. CLI 入口
     ┌──────────────────────┐
     │   bin/umi.js         │
     │   解析命令行参数      │
     └─────────┬────────────┘
               │
               ▼
  2. Service 初始化
     ┌──────────────────────┐
     │   Service.run()      │
     │   - 加载环境变量      │
     │   - 读取 package.json │
     └─────────┬────────────┘
               │
               ▼
  3. 配置加载
     ┌──────────────────────┐
     │   Config.getUserConfig() │
     │   - 读取 .umirc.ts    │
     │   - 读取 .umirc.*.ts  │
     │   - 合并配置          │
     └─────────┬────────────┘
               │
               ▼
  4. 插件注册
     ┌──────────────────────┐
     │   initPresets()      │────────┐
     │   initPlugins()      │        │递归注册
     │   plugin.apply()     │◄───────┘
     └─────────┬────────────┘
               │
               ▼
  5. 配置解析
     ┌──────────────────────┐
     │   resolveConfig()    │
     │   - applyPlugins('modifyConfig') │
     │   - 合并 defaultConfig + userConfig │
     └─────────┬────────────┘
               │
               ▼
  6. 应用数据收集
     ┌──────────────────────┐
     │   modifyAppData      │
     │   - 收集路由信息      │
     │   - 收集依赖信息      │
     │   - 收集框架信息      │
     └─────────┬────────────┘
               │
               ▼
  7. 生成临时文件
     ┌──────────────────────┐
     │   onGenerateFiles    │
     │   - route.ts         │
     │   - plugin.ts        │
     │   - umi.ts           │
     │   - exports.ts       │
     └─────────┬────────────┘
               │
               ▼
  8. 启动开发服务器
     ┌──────────────────────┐
     │   dev command        │
     │   - 启动 webpack dev │
     │   - 启动 vite server │
     │   - 监听文件变化      │
     └──────────────────────┘
```

### 构建模式流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      构建模式流程                                │
└─────────────────────────────────────────────────────────────────┘

  umi build
  
       │
       ▼
  ┌─────────────────┐
  │ 1. 完成所有初始化 │
  │    (同 dev 流程 1-7) │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 2. onBuildStart │
  │    Hook 触发      │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 3. 编译配置生成   │
  │    - webpack config │
  │    - vite config   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 4. 执行构建       │
  │    - bundler.build() │
  │    - 生成 HTML     │
  │    - 生成 JS/CSS   │
  │    - 生成 assets   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 5. onBuildComplete│
  │    Hook 触发       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 6. 输出构建结果   │
  │    - dist/       │
  │    - build-manifest.json │
  └─────────────────┘
```

## 核心模块交互

### Service 与 Plugin 的关系

```
┌─────────────────────────────────────────────────────────────────┐
│                     Service 核心服务                             │
│                                                                 │
│  plugins: Record<string, Plugin>  ← 插件注册表                  │
│  hooks: Record<string, Hook[]>    ← Hook 注册表                 │
│  commands: Record<string, Command>← 命令注册表                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    applyPlugins()                        │   │
│  │  - 按 Hook 类型执行插件                                   │   │
│  │  - event: 依次执行，无返回值                             │   │
│  │  - modify: 链式调用，传递修改结果                        │   │
│  │  - add: 收集所有插件的返回值                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ plugin.apply()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Plugin 插件                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  export default (api) => {                               │   │
│  │    api.describe({ key: 'my-plugin' });                  │   │
│  │    api.register({...});         // 注册 Hook             │   │
│  │    api.registerCommand({...});  // 注册命令              │   │
│  │    api.modifyConfig({...});     // 修改配置              │   │
│  │    api.onGenerateFiles(() => {  // 生成临时文件          │   │
│  │      api.writeTmpFile({...});                           │   │
│  │    });                                                  │   │
│  │  };                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 临时文件生成机制

```
┌─────────────────────────────────────────────────────────────────┐
│                  onGenerateFiles Hook 执行流程                   │
└─────────────────────────────────────────────────────────────────┘

  触发时机：Service.resolveConfig() 之后
  
       │
       ▼
  ┌───────────────────────────────────────────────┐
  │  tmpFiles 插件 (packages/preset-umi)           │
  │                                               │
  │  api.onGenerateFiles(async (opts) => {        │
  │    // 1. 生成 tsconfig.json                   │
  │    api.writeTmpFile({                         │
  │      path: 'tsconfig.json',                   │
  │      content: JSON.stringify(config)          │
  │    });                                        │
  │                                               │
  │    // 2. 生成 route.ts                        │
  │    api.writeTmpFile({                         │
  │      path: 'core/route.tsx',                  │
  │      tplPath: 'route.tpl',                    │
  │      context: { routes, components }          │
  │    });                                        │
  │                                               │
  │    // 3. 生成 plugin.ts                       │
  │    api.writeTmpFile({                         │
  │      path: 'core/plugin.ts',                  │
  │      content: runtimePluginCode               │
  │    });                                        │
  │                                               │
  │    // 4. 生成 umi.ts                          │
  │    api.writeTmpFile({                         │
  │      path: 'umi.ts',                          │
  │      content: entryCode                       │
  │    });                                        │
  │                                               │
  │    // 5. 生成 exports.ts                      │
  │    api.writeTmpFile({                         │
  │      path: 'exports.ts',                      │
  │      content: exportsCode                     │
  │    });                                        │
  │  });                                          │
  └───────────────────────────────────────────────┘
       │
       ▼
  临时文件输出目录：
  - src/.umi/ (有 src 目录时)
  - .umi/ (无 src 目录时)
```

## 插件系统架构

### PluginAPI 的设计

`PluginAPI` 是插件与核心服务之间的桥梁，提供了丰富的 API 供插件使用。

```typescript
// packages/core/src/service/pluginAPI.ts

export class PluginAPI {
  service: Service;  // 指向核心服务
  plugin: Plugin;    // 当前插件实例
  logger: Logger;    // 日志工具
  telemetry: IMetry; // 遥测工具

  // ========== 配置 API ==========
  describe(opts)           // 定义插件配置 schema
  modifyConfig(fn)         // 修改用户配置
  modifyDefaultConfig(fn)  // 修改默认配置

  // ========== 事件/钩子 API ==========
  register(opts)           // 注册 Hook
  registerMethod(opts)     // 注册插件方法

  // ========== 命令 API ==========
  registerCommand(opts)    // 注册 CLI 命令

  // ========== 生成器 API ==========
  registerGenerator(opts)  // 注册代码生成器

  // ========== 插件管理 API ==========
  registerPresets()        // 注册其他 Presets
  registerPlugins()        // 注册其他 Plugins
  skipPlugins()            // 跳过某些插件

  // ========== 文件操作 API ==========
  writeTmpFile(opts)       // 写临时文件
  copyTmpFile(opts)        // 复制临时文件
}
```

### Hook 类型

Umi 定义了三种 Hook 类型，每种类型有不同的执行机制：

| 类型 | 方法签名 | 执行机制 | 使用场景 |
|------|---------|---------|---------|
| `event` | `api.register({ key: 'onXxx', fn })` | 依次执行，无返回值传递 | 生命周期通知 |
| `modify` | `api.register({ key: 'modifyXxx', fn: (memo) => {} })` | 链式调用，传递修改结果 | 配置修改 |
| `add` | `api.register({ key: 'addXxx', fn: () => [] })` | 收集所有插件的返回值，合并为数组 | 添加内容 |

### Hook 执行顺序

Hook 支持通过 `stage` 参数控制执行顺序：

```typescript
// 高 stage 的先执行
api.register({
  key: 'modifyConfig',
  fn: (memo) => { /* ... */ },
  stage: 100  // 早阶段
});

api.register({
  key: 'modifyConfig',
  fn: (memo) => { /* ... */ },
  stage: -100  // 晚阶段
});

// 也可以使用 before 指定在某个插件之前执行
api.register({
  key: 'modifyConfig',
  fn: (memo) => { /* ... */ },
  before: '@umijs/plugin-antd'
});
```

## 配置系统架构

### 配置加载流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    配置加载流程                                  │
└─────────────────────────────────────────────────────────────────┘

  1. 确定配置文件
     .umirc.ts
     .umirc.*.ts (环境特定)
     config/config.ts
     config/config.*.ts

       │
       ▼
  2. 使用 esbuild 注册 loader
     register.register({ implementor: esbuild })

       │
       ▼
  3. 加载并合并配置
     config = lodash.merge(config, require(configFile).default)

       │
       ▼
  4. 验证配置
     Config.validateConfig({ config, schemas })
     - 验证 schema
     - 检查未知配置项

       │
       ▼
  5. 应用插件修改
     config = applyPlugins('modifyConfig', { initialValue: config })
     defaultConfig = applyPlugins('modifyDefaultConfig', {})
     finalConfig = lodash.merge(defaultConfig, config)
```

### 配置变更类型

Umi 支持不同类型的配置变更响应：

```typescript
// packages/core/src/types.ts

export enum ConfigChangeType {
  reload = 'reload',           // 重新加载配置
  regenerateTmpFiles = 'regenerateTmpFiles',  // 重新生成临时文件
  regenerateRoutes = 'regenerateRoutes',       // 重新生成路由
}

// 每个配置项可以定义 onChange 行为
api.describe({
  key: 'alias',
  config: {
    schema: ({ zod }) => zod.record(zod.string()),
    onChange: ConfigChangeType.regenerateTmpFiles,
  },
});
```

## 运行时架构

### 运行时插件系统

运行时插件定义在 `src/app.ts` 中，在浏览器端执行：

```typescript
// src/app.ts
export function patchRoutes({ routes }) {
  // 修改路由
}

export function render(oldRender) {
  // 包装渲染
  oldRender();
}

export function onRouteChange({ route, location }) {
  // 路由变化回调
}

export const analytics = {
  GA_ID: 'xxx'
};
```

### 临时文件结构

生成的临时文件位于 `src/.umi/` 目录：

```
src/.umi/
├── tsconfig.json          # TypeScript 配置
├── typings.d.ts           # 类型定义
├── umi.ts                 # 应用入口
├── umi.server.ts          # SSR 服务端入口
├── exports.ts             # 统一导出
├── plugin.ts              # 运行时插件
├── core/
│   ├── route.tsx          # 路由定义
│   ├── plugin.ts          # 插件运行时
│   ├── history.ts         # 路由历史
│   ├── EmptyRoute.tsx     # 空路由组件
│   └── defineApp.ts       # defineApp 类型
└── plugin-*/
    ├── index.ts           # 各个插件的运行时
    └── types.d.ts         # 插件类型
```

## 构建系统架构

### 多打包器支持

Umi 支持多种打包器，通过配置切换：

```typescript
// .umirc.ts
export default {
  // 默认使用 Webpack
  // bundler: 'webpack',
  
  // 使用 Vite
  vite: {},
  
  // 使用 ESBuild (实验性)
  // mako: {},
}
```

### 构建流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    构建流程 (Webpack 为例)                       │
└─────────────────────────────────────────────────────────────────┘

  1. 生成 Webpack 配置
     ┌──────────────────────┐
     │  modifyWebpackConfig │
     │  Hook 触发            │
     └─────────┬────────────┘
               │
               ▼
  2. 创建 Compiler
     ┌──────────────────────┐
     │  webpack(config)     │
     └─────────┬────────────┘
               │
               ▼
  3. 执行构建
     ┌──────────────────────┐
     │  compiler.run()      │
     └─────────┬────────────┘
               │
               ▼
  4. 输出文件
     ┌──────────────────────┐
     │  - dist/index.html   │
     │  - dist/umi.*.js     │
     │  - dist/umi.*.css    │
     │  - build-manifest.json │
     └──────────────────────┘
```

## 总结

UmiJS 的整体架构设计体现了以下原则：

1. **分层清晰** - 核心层、编译时层、运行时层职责明确
2. **插件驱动** - 几乎所有功能都通过插件实现
3. **约定优先** - 默认约定减少配置成本
4. **灵活扩展** - 插件系统提供强大的扩展能力
5. **多方案支持** - 支持 Webpack/Vite 多种打包器

理解整体架构是深入学习 Umi 源码的基础。后续章节将深入探讨每个核心子系统的实现细节。

---

📖 **上一篇**: [调试指南](/guide/debugging)
📖 **下一篇**: [插件系统](/architecture/plugin-system)