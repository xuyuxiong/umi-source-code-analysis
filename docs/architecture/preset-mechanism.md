# Preset 机制

## 概述

Preset (预设) 是 Umi 中一种特殊的插件类型，用于组织和注册其他插件。Preset 是构建 Umi 功能模块的基本单位，`@umijs/preset-umi` 包含了 Umi 的所有核心功能。

## Preset vs Plugin

| 特性 | Preset | Plugin |
|------|--------|--------|
| 执行顺序 | 优先执行 | 在 Preset 之后 |
| 返回值 | 可以返回 presets/plugins | 不应返回值 |
| 用途 | 组织插件集合 | 实现具体功能 |
| 命名 | `preset-xxx` | `plugin-xxx` 或功能名 |
| 层级 | 较高 | 较低 |

## @umijs/preset-umi 结构

### 目录结构

```
packages/preset-umi/src/
├── index.ts              # Preset 入口
├── types.ts              # 类型定义
├── constants.ts          # 常量定义
├── registerMethods.ts    # 注册插件方法
├── features/             # 功能特性目录
│   ├── apiRoute/         # API 路由
│   ├── appData/          # 应用数据收集
│   ├── check/            # 检查模块
│   ├── clientLoader/     # 客户端加载器
│   ├── codeSplitting/    # 代码分割
│   ├── configPlugins/    # 配置插件
│   ├── dev/              # 开发模式
│   ├── mfsu/             # MFSU 加速
│   ├── tmpFiles/         # 临时文件生成
│   ├── webpack/          # Webpack 打包
│   ├── vite/             # Vite 打包
│   └── ... (40+ 特性)
├── commands/             # 命令实现
│   ├── build/
│   ├── dev/
│   ├── config/
│   └── ...
└── utils/                # 工具函数
```

### 入口文件

```typescript
// packages/preset-umi/src/index.ts

export default () => {
  return {
    plugins: [
      // 1. 注册方法 (定义 Hook API)
      require.resolve('./registerMethods'),

      // 2. 可选插件 (根据环境变量)
      process.env.DID_YOU_KNOW !== 'none' &&
        require.resolve('@umijs/did-you-know/dist/plugin'),

      // 3. 基础特性插件
      require.resolve('./features/404/404'),
      require.resolve('./features/check/check'),
      require.resolve('./features/configPlugins/configPlugins'),
      
      // 4. 临时文件生成 (核心)
      require.resolve('./features/tmpFiles/tmpFiles'),
      
      // 5. 构建相关
      require.resolve('./features/webpack/webpack'),
      require.resolve('./features/vite/vite'),
      require.resolve('./features/mfsu/mfsu'),
      
      // 6. SSR 相关 (依赖临时文件)
      require.resolve('./features/ssr/ssr'),
      
      // 7. 命令
      require.resolve('./commands/dev/dev'),
      require.resolve('./commands/build'),
      require.resolve('./commands/config/config'),
      
      // ... 40+ 个插件
    ].filter(Boolean), // 过滤掉 false 值
  };
};
```

## 插件注册顺序解析

### 执行顺序示例

```typescript
// 注册顺序决定了执行顺序
plugins: [
  // 第一步：注册方法 (定义 Hook API)
  './registerMethods',
  
  // 第二步：配置插件 (处理配置)
  './features/configPlugins/configPlugins',
  
  // 第三步：临时文件生成
  './features/tmpFiles/tmpFiles',
  
  // 第四步：Webpack/Vite 打包
  './features/webpack/webpack',
  
  // 第五步：命令
  './commands/dev/dev',
]
```

### 为什么顺序重要？

```typescript
// 示例：tmpFiles 需要在 configPlugins 之后
// 因为需要访问最终的配置

// ✅ 正确顺序
plugins: [
  './features/configPlugins/configPlugins',  // 先处理配置
  './features/tmpFiles/tmpFiles',            // 再生成临时文件
]

// ❌ 错误顺序
plugins: [
  './features/tmpFiles/tmpFiles',
  './features/configPlugins/configPlugins',  // 配置还没处理!
]
```

## 核心特性插件

### configPlugins - 配置插件

```typescript
// packages/preset-umi/src/features/configPlugins/configPlugins.ts

export default (api) => {
  api.register({
    key: 'modifyConfigSchemas',
    fn: (memo: any) => {
      // 1. 注册所有配置项的 schema
      // 2. 每个插件通过 api.describe() 定义自己的配置
      // 3. 收集所有 schema 用于验证
      return memo;
    },
  });
};
```

### tmpFiles - 临时文件生成

```typescript
// packages/preset-umi/src/features/tmpFiles/tmpFiles.ts

export default (api) => {
  api.describe({
    key: 'tmpFiles',
    enableBy: api.EnableBy.always,
  });

  api.onGenerateFiles(async () => {
    // 生成所有临时文件
    
    // 1. tsconfig.json
    api.writeTmpFile({
      path: 'tsconfig.json',
      content: JSON.stringify(tsConfig, null, 2),
    });

    // 2. route.tsx (路由定义)
    api.writeTmpFile({
      path: 'core/route.tsx',
      tplPath: join(TEMPLATES_DIR, 'route.tpl'),
      context: { routes, components },
    });

    // 3. plugin.ts (运行时插件)
    api.writeTmpFile({
      path: 'core/plugin.ts',
      tplPath: join(TEMPLATES_DIR, 'plugin.tpl'),
      context: { plugins, validKeys },
    });

    // 4. umi.ts (应用入口)
    api.writeTmpFile({
      path: 'umi.ts',
      tplPath: join(TEMPLATES_DIR, 'umi.tpl'),
      context: { rendererPath, imports },
    });

    // 5. exports.ts (统一导出)
    api.writeTmpFile({
      path: 'exports.ts',
      content: exportsCode,
    });
  });
};
```

### webpack - Webpack 打包

```typescript
// packages/preset-umi/src/features/webpack/webpack.ts

export default (api) => {
  api.describe({
    key: 'webpack',
    enableBy: () => !api.config.vite, // 未使用 Vite 时启用
  });

  api.modifyBundleConfigs((memo) => {
    // 修改构建配置
    return {
      ...memo,
      webpackConfig: api.webpackConfig,
    };
  });

  api.chainWebpack((config) => {
    // 使用 webpack-chain 修改配置
    config
      .output
        .path(api.paths.absOutputPath)
        .filename('[name].[contenthash:8].js')
      .end();
  });
};
```

### mfsu - 模块联邦加速

```typescript
// packages/preset-umi/src/features/mfsu/mfsu.ts

export default (api) => {
  api.describe({
    key: 'mfsu',
    enableBy: api.EnableBy.config,
  });

  api.modifyBundlerChain(async (memo) => {
    // 添加 MFSU 插件
    memo
      .plugin('mfsu')
      .use(require('@umijs/mfsu/src/webpack').MFSU, [{
        cwd: api.cwd,
        src: api.paths.absSrcPath,
        remoteName: 'mf',
      }]);
  });
};
```

## Preset 开发指南

### 基本结构

```typescript
// preset-my-preset/src/index.ts
import type { IApi } from 'umi';

export default () => {
  return {
    plugins: [
      // 注册插件
      require.resolve('./plugins/my-plugin'),
      require.resolve('./plugins/another-plugin'),
    ],
  };
};
```

### 组织插件

```
preset-my-preset/src/
├── index.ts              # 入口
├── plugins/              # 插件目录
│   ├── feature1.ts       # 功能 1
│   ├── feature2.ts       # 功能 2
│   └── feature3.ts       # 功能 3
└── utils/                # 工具函数
```

### 条件注册

```typescript
export default () => {
  return {
    plugins: [
      // 基本插件
      require.resolve('./plugins/basic'),
      
      // 条件插件
      process.env.ENABLE_FEATURE &&
        require.resolve('./plugins/feature'),
      
      // 根据配置启用
      // (在插件内部通过 enableBy 控制)
    ].filter(Boolean),
  };
};
```

## 插件方法注册

### registerMethods

```typescript
// packages/preset-umi/src/registerMethods.ts

export default (api: IApi) => {
  // 注册 writeTmpFile 方法
  api.registerMethod({
    name: 'writeTmpFile',
    fn(opts: { path: string; content?: string; tplPath?: string; context?: any }) {
      // 写临时文件逻辑
    },
  });

  // 注册 copyTmpFile 方法
  api.registerMethod({
    name: 'copyTmpFile',
    fn(opts: { from: string; path: string }) {
      // 复制临时文件逻辑
    },
  });

  // 注册 addHTMLHead 方法
  api.registerMethod({
    name: 'addHTMLHead',
    fn(content: string) {
      this.addHTMLHead = content;
    },
  });
};
```

## 配置项定义

### 在 Preset 中定义配置

```typescript
// packages/preset-umi/src/features/mfsu/mfsu.ts

export default (api) => {
  api.describe({
    key: 'mfsu',
    config: {
      // 定义 schema
      schema({ zod }) {
        return zod.object({
          // 策略
          strategy: zod.enum(['normal', 'eager']).default('normal'),
          
          // 依赖编译
          depTranspiler: zod.enum(['tsc', 'esbuild']).default('esbuild'),
          
          // 缓存
          cache: zod.object({
            path: zod.string().optional(),
          }).optional(),
          
          // 开发配置
          development: zod.object({
            output: zod.string().optional(),
          }).optional(),
          
          // 生产配置
          production: zod.object({
            output: zod.string().optional(),
          }).optional(),
        }).optional();
      },
      
      // 配置变更类型
      onChange: api.ConfigChangeType.reload,
    },
  });
  
  // ...
};
```

## 生命周期管理

### 注册时机

```typescript
export default (api) => {
  // 运行时立即执行
  api.logger.info('插件初始化');
  
  // 描述插件 (配置定义)
  api.describe({ key: 'my-feature' });
  
  // 注册 Hook (在注册阶段)
  api.register({
    key: 'onStart',
    fn: () => {
      // onStart Hook 在服务启动时执行
    },
  });
  
  // 注册命令
  api.registerCommand({
    name: 'my-command',
    fn: () => { /* ... */ },
  });
};
```

### 执行时机

```
Service.run()
  │
  ├─> initPresets (注册 Presets)
  │     └─> plugin.apply(api)  执行 Preset 的 apply 函数
  │
  ├─> initPlugins (注册 Plugins)
  │     └─> plugin.apply(api)  执行 Plugin 的 apply 函数
  │
  ├─> resolveConfig (解析配置)
  ├─> onGenerateFiles (生成临时文件)
  ├─> runCommand (执行命令)
```

## 依赖管理

### 跨 Preset 依赖

```typescript
// preset-a/src/index.ts
export default () => {
  return {
    plugins: [
      require.resolve('./plugins/a1'),
      require.resolve('./plugins/a2'),
    ],
  };
};

// preset-b/src/index.ts
export default () => {
  return {
    presets: [
      // 依赖 preset-a
      require.resolve('preset-a'),
    ],
    plugins: [
      require.resolve('./plugins/b1'),
    ],
  };
};
```

### 插件依赖顺序

```typescript
export default (api) => {
  // 使用 stage 控制顺序
  api.register({
    key: 'modifyConfig',
    fn: (memo) => { /* ... */ },
    stage: 100,  // 早阶段
  });

  api.register({
    key: 'modifyConfig',
    fn: (memo) => { /* ... */ },
    stage: -100,  // 晚阶段
  });

  // 使用 before/after
  api.register({
    key: 'modifyConfig',
    fn: (memo) => { /* ... */ },
    before: '@umijs/plugin-antd',
  });
};
```

## 官方 Presets

### @umijs/preset-umi

Umi 核心 Preset，包含所有基础功能。

### @umijs/preset-vue

Vue 3 支持 Preset。

```typescript
export default () => {
  return {
    plugins: [
      require.resolve('./features/vue/vue'),
      require.resolve('./features/vue-router/vue-router'),
      // ...
    ],
  };
};
```

## 调试 Preset

### 查看注册的插件

```bash
DEBUG=umi:plugin* pnpm dev
```

### 查看插件执行时间

```bash
pnpm dev --profilePlugins --profilePluginsVerbose
```

输出：
```
plugin @umijs/preset-umi 245
       register 32
       hooks {"modifyConfig":[45],"onGenerateFiles":[156]}

plugin @umijs/bundler-webpack 128
       register 18
       hooks {"modifyWebpackConfig":[110]}
```

## 总结

Preset 机制是 Umi 架构的核心：

1. **组织插件** - 将功能相关的插件组织在一起
2. **条件加载** - 根据配置和环境动态启用
3. **继承扩展** - Preset 可以依赖其他 Presets
4. **统一管理** - 核心功能通过 preset-umi 统一管理

理解 Preset 机制对于开发 Umi 插件和扩展框架功能至关重要。

---

📖 **上一篇**: [路由系统](/architecture/routing-system)
📖 **下一篇**: [App 服务](/core/app-service)