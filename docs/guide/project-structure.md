# 源码结构

## Monorepo 架构详解

UmiJS 使用 Monorepo 架构管理所有子包，通过 pnpm workspace 和 Turborepo 实现高效的依赖管理和构建优化。

### 根目录结构

```
umi/
├── .github/                 # GitHub 相关配置
│   ├── workflows/           # CI/CD 工作流
│   └── ISSUE_TEMPLATE/      # Issue 模板
├── .husky/                  # Git Hooks 配置
├── .vscode/                 # VS Code 配置
├── docs/                    # 官方文档
├── examples/                # 示例项目 (90+ 个)
├── packages/                # 核心包目录 (重点!)
├── scripts/                 # 构建/发布脚本
├── tests/                   # 集成测试
├── package.json            # 根配置
├── pnpm-workspace.yaml     # pnpm workspace 定义
└── turbo.json              # Turborepo 配置
```

## 核心包详解

### @umijs/core - 核心服务层

**位置**: `packages/core/`

这是 Umi 的最核心包，提供了框架的基础设施。所有上层功能都构建在这个基础之上。

```
packages/core/src/
├── index.ts               # 统一导出
├── constants.ts           # 常量定义
├── types.ts               # 核心类型定义
├── config/
│   └── config.ts          # 配置加载与验证
├── route/
│   ├── routesConfig.ts    # 配置式路由
│   ├── routesConvention.ts # 约定式路由  
│   └── routeUtils.ts      # 路由工具函数
├── service/
│   ├── service.ts         # [核心] Service 类
│   ├── pluginAPI.ts       # 插件 API
│   ├── plugin.ts          # 插件定义
│   ├── hook.ts            # Hook 实现
│   ├── command.ts         # 命令定义
│   ├── generator.ts       # 生成器
│   ├── path.ts            # 路径工具
│   ├── env.ts             # 环境变量
│   ├── telemetry.ts       # 遥测
│   └── utils.ts           # 工具函数
└── logger.ts              # 日志工具
```

**关键类说明**:

| 类 | 作用 |
|---|---|
| `Service` | 核心服务类，管理插件、Hook、命令的生命周期 |
| `PluginAPI` | 插件可用的 API，提供给所有插件调用 |
| `Plugin` | 插件类，封装插件的元数据和执行函数 |
| `Hook` | Hook 类，封装 Hook 的执行逻辑 |
| `Command` | 命令类，定义 CLI 命令 |
| `Config` | 配置类，处理配置加载和验证 |

### @umijs/umi - 主包

**位置**: `packages/umi/`

这是 Umi 的主包，也是用户直接安装的包。它聚合了所有必要的依赖，提供统一的入口。

```
packages/umi/
├── bin/
│   └── umi.js             # CLI 入口程序
├── client/
│   └── client/
│       ├── plugin.js      # 运行时插件入口
│       └── types.ts       # 运行时类型
├── dist/
│   └── index.js           # 编译后入口
├── package.json
└── tests/
```

**package.json 关键依赖**:

```json
{
  "name": "@umijs/umi",
  "dependencies": {
    "@umijs/core": "workspace:*",
    "@umijs/preset-umi": "workspace:*",
    "@umijs/renderer-react": "workspace:*",
    "@umijs/bundler-webpack": "workspace:*",
    "@umijs/bundler-vite": "workspace:*",
    "@umijs/mfsu": "workspace:*",
    "@umijs/utils": "workspace:*"
  }
}
```

### @umijs/preset-umi - Preset 实现

**位置**: `packages/preset-umi/`

这是 Umi 的核心 Preset，包含了 Umi 的所有核心功能实现。

```
packages/preset-umi/src/
├── index.ts               # Preset 入口，注册所有插件
├── types.ts               # 类型定义 (IApi, IConfig, IRoute)
├── constants.ts           # 常量定义
├── features/             # 功能特性目录
│   ├── apiRoute/         # API 路由
│   ├── appData/          # 应用数据收集
│   ├── check/            # 检查模块
│   ├── clientLoader/     # 客户端加载器
│   ├── codeSplitting/    # 代码分割
│   ├── configPlugins/    # 配置插件
│   ├── dev/              # 开发模式
│   ├── devTool/          # 开发工具
│   ├── exportStatic/     # 静态导出
│   ├── icons/            # 图标
│   ├── mfsu/             # MFSU 加速
│   ├── mock/             # Mock 数据
│   ├── mpa/              # 多页应用
│   ├── overrides/        # 模块覆盖
│   ├── polyfill/         #  polyfill
│   ├── prepare/          # 预处理
│   ├── routePrefetch/    # 路由预加载
│   ├── routeProps/       # 路由属性
│   ├── ssr/              # 服务端渲染
│   ├── terminal/         # 终端
│   ├── tmpFiles/         # [核心] 临时文件生成
│   │   ├── tmpFiles.ts   # [核心] 主逻辑
│   │   ├── routes.ts     # 路由生成
│   │   ├── getModuleExports.ts
│   │   └── importsToStr.ts
│   ├── transform/        # 代码转换
│   ├── vite/             # Vite 打包
│   ├── webpack/          # Webpack 打包
│   └── ... 更多特性
├── commands/             # 命令实现
│   ├── build/
│   ├── dev/
│   ├── config/
│   ├── help/
│   ├── version/
│   └── generators/       # 代码生成器
└── utils/                # 工具函数
```

**index.ts 插件注册列表**:

```typescript
export default () => {
  return {
    plugins: [
      // 注册方法
      require.resolve('./registerMethods'),

      // 特性插件
      require.resolve('./features/configPlugins/configPlugins'),
      require.resolve('./features/tmpFiles/tmpFiles'),  // [核心]
      require.resolve('./features/webpack/webpack'),
      require.resolve('./features/vite/vite'),
      require.resolve('./features/mfsu/mfsu'),
      require.resolve('./features/ssr/ssr'),
      require.resolve('./features/mock/mock'),
      // ... 40+ 个特性插件

      // 命令
      require.resolve('./commands/dev/dev'),
      require.resolve('./commands/build'),
      require.resolve('./commands/config/config'),
      // ... 更多命令
    ].filter(Boolean),
  };
};
```

### @umijs/renderer-react - React 渲染器

**位置**: `packages/renderer-react/`

负责 React 应用的渲染，包括客户端渲染和服务端渲染。

```
packages/renderer-react/src/
├── index.ts              # 统一导出
├── client/
│   └── client.tsx        # 客户端渲染逻辑
├── server/
│   └── server.tsx        # 服务端渲染逻辑
├── renderClient.tsx      # 客户端渲染入口
├── renderServer.tsx      # 服务端渲染入口
└── types.ts              # 类型定义
```

### @umijs/bundler-webpack - Webpack 打包器

**位置**: `packages/bundler-webpack/`

```
packages/bundler-webpack/src/
├── index.ts              # 入口
├── webpack/
│   ├── index.ts          # Webpack 封装
│   ├── config.ts         # Webpack 配置
│   ├── plugins/          # 内置插件
│   │   ├── cors.ts
│   │   ├── devtool.ts
│   │   └── ...
│   └── loaders/          # 内置 loader
└── builder.ts            # 构建器实现
```

### @umijs/bundler-vite - Vite 打包器

**位置**: `packages/bundler-vite/`

```
packages/bundler-vite/src/
├── index.ts              # 入口
├── config/
│   └── index.ts          # Vite 配置
├── builder.ts            # 构建器实现
└── plugin.ts             # Vite 插件
```

### @umijs/mfsu - 模块联邦加速

**位置**: `packages/mfsu/`

MFSU (Module Federation Speed Up) 是 Umi 的构建加速方案，基于 Webpack 5 的 Module Federation。

```
packages/mfsu/src/
├── index.ts              # 入口
├── mfsu/
│   ├── index.ts          # MFSU 核心
│   ├── config.ts         # 配置
│   ├── plugin.ts         # MFSU 插件
│   ├── depBuilder.ts     # 依赖构建
│   └── microTask.ts      # 微任务调度
└── utils/
```

### @umijs/plugins - 插件集合

**位置**: `packages/plugins/`

```
packages/plugins/src/
├── antd/                 # Ant Design 集成
├── dva/                  # Dva 状态管理
├── qiankun/              # 微前端集成
├── locale/               # 国际化
├── layout/               # 布局
├── model/                # 数据流
├── initial-state/        # 初始状态
├── access/               # 权限
└── ... 更多官方插件
```

### @umijs/max - 全功能版本

**位置**: `packages/max/`

@umijs/max 是 Umi 的全功能版本，集成了所有官方插件。

```
packages/max/
├── index.ts              # 统一导出
└── package.json          # 包含所有插件依赖
```

## 包依赖关系图

```
        ┌─────────────────┐
        │   @umijs/max    │
        │   (全功能版)     │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   @umijs/umi    │
        │     (主包)       │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌───────┐  ┌──────────┐  ┌────────────┐
│ core  │  │preset-umi│  │renderer-xxx│
│(核心)  │  │(Preset)  │  │  (渲染器)  │
└───┬───┘  └────┬─────┘  └────────────┘
    │           │
    │    ┌──────┼──────┐
    │    │      │      │
    ▼    ▼      ▼      ▼
 ┌─────┐ ┌─────┐ ┌──────────┐
 │utils│ │mfsu │ │bundler-* │
 │(工具)│ │(加速)│ │(打包器)  │
 └─────┘ └─────┘ └──────────┘
```

## 关键源码路径对应表

| 功能模块 | 源码位置 | 关键文件 |
|---------|---------|---------|
| 核心服务 | `packages/core/src/service/` | `service.ts`, `pluginAPI.ts` |
| 配置系统 | `packages/core/src/config/` | `config.ts` |
| 路由系统 | `packages/core/src/route/` | `routesConvention.ts` |
| 临时文件 | `packages/preset-umi/src/features/tmpFiles/` | `tmpFiles.ts`, `routes.ts` |
| Webpack | `packages/preset-umi/src/features/webpack/` | `webpack.ts` |
| Vite | `packages/preset-umi/src/features/vite/` | `vite.ts` |
| MFSU | `packages/preset-umi/src/features/mfsu/` | `mfsu.ts` |
| SSR | `packages/preset-umi/src/features/ssr/` | `ssr.ts` |
| Dev | `packages/preset-umi/src/commands/dev/` | `dev.ts` |
| Build | `packages/preset-umi/src/commands/build/` | `build.ts` |

## 示例项目结构

Umi 提供了 90+ 个示例项目，位于 `examples/` 目录：

```
examples/
├── normal/                 # 基础示例
├── config-router/          # 配置式路由
├── convention-router/      # 约定式路由
├── ssr/                    # SSR 示例
├── mfsu/                   # MFSU 示例
├── vite/                   # Vite 示例
├── micro-frontend/         # 微前端示例
├── dva/                    # Dva 集成
├── antd/                   # Ant Design 集成
└── ... (更多)              # 涵盖各种场景
```

## 构建配置

### pnpm workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'examples/*'
  - 'tests/*'
```

### Turborepo 配置

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## 总结

UmiJS 的源码结构清晰，模块职责分明：

1. **@umijs/core** - 基础设施，提供核心服务
2. **@umijs/preset-umi** - 功能实现，包含所有特性
3. **@umijs/umi** - 统一入口，聚合所有依赖
4. **@umijs/renderer-*** - 渲染层，支持多框架
5. **@umijs/bundler-*** - 构建层，支持多打包器
6. **@umijs/plugins** - 扩展插件，按需使用
7. **@umijs/max** - 全功能版本，开箱即用

理解这个结构是深入 Umi 源码的第一步。后续章节将深入探讨每个核心模块的实现细节。

---

📖 **下一篇**: [调试指南](/guide/debugging)