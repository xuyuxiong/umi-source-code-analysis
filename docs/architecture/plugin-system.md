# 插件系统

## 插件系统概述

插件系统是 UmiJS 的灵魂所在。整个框架的设计理念是"一切皆插件"，所有功能（包括核心功能）都是通过插件实现的。

### 插件系统的核心价值

1. **模块化** - 每个功能独立实现，职责单一
2. **可插拔** - 按需启用/禁用功能
3. **可扩展** - 自定义插件添加新功能
4. **可测试** - 独立插件易于单元测试
5. **生态丰富** - 官方 + 社区插件生态

## 插件层级结构

```
┌─────────────────────────────────────────────────────────────────┐
│                        插件层级结构                              │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                     @umijs/umi (主包)                        │
  │                          │                                   │
  │                          ▼                                   │
  │  ┌─────────────────────────────────────────────────────────┐│
  │  │                  @umijs/preset-umi                      ││
  │  │  (官方 Preset，包含所有核心功能插件)                       ││
  │  │                                                          ││
  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     ││
  │  │  │  features/  │  │  commands/  │  │   utils/    │     ││
  │  │  │  (特性插件)  │  │  (命令插件)  │  │  (工具函数)  │     ││
  │  │  └─────────────┘  └─────────────┘  └─────────────┘     ││
  │  └─────────────────────────────────────────────────────────┘│
  │                          │                                   │
  │                          ▼                                   │
  │  ┌─────────────────────────────────────────────────────────┐│
  │  │                   @umijs/plugins                         ││
  │  │  (官方插件集合：antd, dva, qiankun, locale, ...)          ││
  │  └─────────────────────────────────────────────────────────┘│
  └─────────────────────────────────────────────────────────────┘
                          │
                          ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                     用户自定义插件                            │
  │              (在 plugins/ 目录或 npm 包中定义)                  │
  └─────────────────────────────────────────────────────────────┘
```

## 插件类型

Umi 定义了两种插件类型：

### 1. Preset (预设)

Preset 是特殊的插件，用于组织和注册其他插件。通常用于批量注册功能相关的插件。

```typescript
// packages/preset-umi/src/index.ts
export default () => {
  return {
    plugins: [
      // 注册方法
      require.resolve('./registerMethods'),

      // 特性插件
      require.resolve('./features/configPlugins/configPlugins'),
      require.resolve('./features/tmpFiles/tmpFiles'),
      require.resolve('./features/webpack/webpack'),
      // ... 40+ 个插件

      // 命令
      require.resolve('./commands/dev/dev'),
      require.resolve('./commands/build'),
    ].filter(Boolean),
  };
};
```

**Preset 的特点**:
- 执行优先级高于普通插件
- 可以注册其他 Presets 和 Plugins
- 通常作为功能集合的入口
- 命名约定：`preset-xxx`

### 2. Plugin (插件)

Plugin 是基础的功能单元，实现具体的功能。

```typescript
// 示例：自定义插件
export default (api) => {
  // 描述插件
  api.describe({
    key: 'my-plugin',
    config: {
      schema({ zod }) {
        return zod.object({
          someOption: zod.string().optional(),
        });
      },
    },
  });

  // 注册 Hook
  api.modifyConfig((memo) => {
    memo.alias = {
      ...memo.alias,
      '@': api.paths.absSrcPath,
    };
    return memo;
  });

  // 生成临时文件
  api.onGenerateFiles(() => {
    api.writeTmpFile({
      path: 'plugin-my-plugin/runtime.ts',
      content: `
        export function onRouteChange({ route, location }) {
          console.log('Route changed:', location.pathname);
        }
      `,
    });
  });

  // 添加运行时插件
  api.addRuntimePlugin(() => ['@@/plugin-my-plugin/runtime.ts']);
};
```

**Plugin 的特点**:
- 实现具体功能
- 通过 Hook 与核心交互
- 可以有配置项
- 支持编译时和运行时

## PluginAPI 详解

`PluginAPI` 是插件可用的所有 API 的集合。

### API 分类

#### 1. 配置相关 API

```typescript
// 定义插件配置 schema
api.describe({
  key: 'my-plugin',
  config: {
    schema({ zod, joi }) {
      // 使用 Zod 或 Joi 定义 schema
      return zod.object({
        option1: zod.string().default('default'),
        option2: zod.number().optional(),
      });
    },
    onChange: ConfigChangeType.reload,
  },
});

// 修改用户配置
api.modifyConfig((memo) => {
  memo.alias = { ...memo.alias, '@': api.paths.absSrcPath };
  return memo;
});

// 修改默认配置
api.modifyDefaultConfig((memo) => {
  memo.mountElementId = 'root';
  return memo;
});
```

#### 2. Hook 相关 API

```typescript
// 注册 Hook
api.register({
  key: 'onGenerateFiles',  // Hook 名称
  fn: () => {
    // ...
  },
  stage: 10,  // 执行阶段 (数字越大越早执行)
  before: '@umijs/plugin-antd',  // 在某个插件之前执行
});

// 注册插件方法 (自定义 Hook)
api.registerMethod({
  name: 'addEntry',
  fn(entry) {
    this.addEntryCode(`import '${entry}';`);
  },
});

// 调用方法
api.addEntry('./global.css');
```

#### 3. 文件操作 API

```typescript
// 写临时文件
api.writeTmpFile({
  path: 'core/runtime.ts',
  content: 'export const runtime = {};',
});

// 使用模板写文件
api.writeTmpFile({
  path: 'core/plugin.ts',
  tplPath: join(TEMPLATES_DIR, 'plugin.tpl'),
  context: {
    plugins: ['plugin1', 'plugin2'],
  },
});

// 复制临时文件
api.copyTmpFile({
  from: join(__dirname, 'assets', 'logo.png'),
  path: 'assets/logo.png',
});
```

#### 4. 命令相关 API

```typescript
// 注册命令
api.registerCommand({
  name: 'my-command',
  description: '我的自定义命令',
  options: {
    '-o, --output <path>': '输出路径',
  },
  fn: ({ args }) => {
    console.log('Running my command...');
    console.log('Output:', args.output);
  },
});
```

#### 5. 生成器相关 API

```typescript
// 注册代码生成器
api.registerGenerator({
  key: 'page',
  description: '生成页面组件',
  options: {
    name: { type: 'string', description: '页面名称', required: true },
  },
  fn: async (args) => {
    return {
      files: [
        {
          path: `src/pages/${args.name}/index.tsx`,
          content: `export default function Page() { return <div>${args.name}</div> }`,
        },
      ],
    };
  },
});
```

## Hook 系统

### Hook 类型

Umi 定义了三种 Hook 类型：

#### 1. Event 类型 (事件)

依次执行，不传递返回值。

```typescript
// 注册
api.register({
  key: 'onStart',
  fn: () => {
    console.log('Started!');
  },
});

// 执行
await api.applyPlugins({
  key: 'onStart',
  type: api.ApplyPluginsType.event,
});
```

#### 2. Modify 类型 (修改)

链式调用，传递修改结果。

```typescript
// 注册
api.register({
  key: 'modifyConfig',
  fn: (memo) => {
    memo.alias = { ...memo.alias, '@utils': '@/utils' };
    return memo;
  },
});

// 执行
const config = await api.applyPlugins({
  key: 'modifyConfig',
  type: api.ApplyPluginsType.modify,
  initialValue: {},
});
```

#### 3. Add 类型 (添加)

收集所有插件的返回值，合并为数组。

```typescript
// 注册
api.register({
  key: 'addEntryCode',
  fn: () => `console.log('entry code');`,
});

// 执行
const codes = await api.applyPlugins({
  key: 'addEntryCode',
  type: api.ApplyPluginsType.add,
  initialValue: [],
});
// 结果：['console.log("entry code");', '...']
```

### Hook 命名规范

| 前缀 | 类型 | 示例 |
|------|------|------|
| `on` | Event | `onStart`, `onBuildStart`, `onGenerateFiles` |
| `modify` | Modify | `modifyConfig`, `modifyWebpackConfig`, `modifyAppData` |
| `add` | Add | `addEntryCode`, `addRuntimePlugin`, `addTmpPluginPath` |

### Hook 执行顺序控制

```typescript
// 方式 1: 使用 stage (数字越大越早执行)
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

// 方式 2: 使用 before (在某个插件之前执行)
api.register({
  key: 'modifyConfig',
  fn: (memo) => { /* ... */ },
  before: '@umijs/plugin-antd',
});

// 方式 3: 使用 after (在某个插件之后执行)
api.register({
  key: 'modifyConfig',
  fn: (memo) => { /* ... */ },
  after: '@umijs/plugin-dva',
});
```

## 插件注册流程

### Service 插件注册流程

```typescript
// packages/core/src/service/service.ts

async run(opts: { name: string; args?: any }) {
  // ...
  
  // 1. 解析初始 Presets 和 Plugins
  const { plugins, presets } = Plugin.getPluginsAndPresets({
    cwd: this.cwd,
    pkg,
    plugins: [
      require.resolve('./generatePlugin')  // 内置插件
    ].concat(this.opts.plugins || []),
    presets: [
      require.resolve('./servicePlugin')   // 内置 Preset
    ].concat(this.opts.presets || []),
    userConfig: this.userConfig,
    prefix: this.frameworkName,
  });

  // 2. 注册 Presets (递归)
  this.stage = ServiceStage.initPresets;
  const presetPlugins: Plugin[] = [];
  while (presets.length) {
    await this.initPreset({
      preset: presets.shift()!,
      presets,
      plugins: presetPlugins,
    });
  }
  plugins.unshift(...presetPlugins);

  // 3. 注册 Plugins
  this.stage = ServiceStage.initPlugins;
  while (plugins.length) {
    await this.initPlugin({
      plugin: plugins.shift()!,
      plugins,
    });
  }

  // ...
}
```

### 单个插件初始化

```typescript
async initPlugin(opts: {
  plugin: Plugin;
  presets?: Plugin[];
  plugins: Plugin[];
}) {
  // 1. 注册到插件表
  this.plugins[opts.plugin.id] = opts.plugin;

  // 2. 创建 PluginAPI
  const pluginAPI = new PluginAPI({
    plugin: opts.plugin,
    service: this,
  });

  // 3. 创建代理 API (暴露 service 属性)
  const proxyPluginAPI = PluginAPI.proxyPluginAPI({
    service: this,
    pluginAPI,
    serviceProps: [
      'appData', 'applyPlugins', 'args', 'config',
      'cwd', 'pkg', 'paths', 'userConfig', 'env',
      'isPluginEnable'
    ],
    staticProps: {
      ApplyPluginsType,
      ConfigChangeType,
      EnableBy,
      ServiceStage,
      service: this,
    },
  });

  // 4. 执行插件
  let ret = await opts.plugin.apply()(proxyPluginAPI);

  // 5. 处理返回值 (额外的 presets/plugins)
  if (ret?.presets) {
    // 递归注册额外的 presets
  }
  if (ret?.plugins) {
    // 递归注册额外的 plugins
  }

  return ret || {};
}
```

## 内置 Hook 列表

### 生命周期 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `onCheck` | Event | 配置检查完成 |
| `onStart` | Event | 服务启动 |
| `onBuildStart` | Event | 构建开始 |
| `onBuildSuccess` | Event | 构建成功 |
| `onBuildFail` | Event | 构建失败 |
| `onDevCompileDone` | Event | 开发环境编译完成 |

### 文件生成 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `onGenerateFiles` | Event | 生成临时文件 |
| `addEntryCode` | Add | 添加入口代码 |
| `addEntryCodeAhead` | Add | 添加入口代码 (靠前) |
| `addEntryImports` | Add | 添加入口导入 |
| `addEntryImportsAhead` | Add | 添加入口导入 (靠前) |

### 配置 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `modifyConfig` | Modify | 修改配置 |
| `modifyDefaultConfig` | Modify | 修改默认配置 |
| `modifyUserConfig` | Modify | 修改用户配置 |

### 路由 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `addModifyRoute` | Add | 添加/修改路由 |
| `modifyRoutes` | Modify | 修改路由配置 |
| `addRouteComponent` | Add | 添加路由组件 |

### 构建 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `modifyWebpackConfig` | Modify | 修改 Webpack 配置 |
| `modifyViteConfig` | Modify | 修改 Vite 配置 |
| `modifyBundleConfigs` | Modify | 修改打包配置 |
| `chainWebpack` | Modify | Webpack chain 修改 |

### 运行时 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `addRuntimePlugin` | Add | 添加运行时插件 |
| `addRuntimePluginKey` | Add | 添加运行时插件 key |
| `modifyRendererPath` | Modify | 修改渲染器路径 |

### 数据 Hook

| Hook | 类型 | 说明 |
|------|------|------|
| `modifyAppData` | Modify | 修改应用数据 |
| `modifyPaths` | Modify | 修改路径 |

## 自定义插件开发指南

### 项目结构

```
umi-plugin-myname/
├── src/
│   └── index.ts         # 插件入口
├── package.json
└── README.md
```

### 基础插件模板

```typescript
// umi-plugin-myname/src/index.ts
import type { IApi } from 'umi';

export default (api: IApi) => {
  // 1. 描述插件
  api.describe({
    key: 'myname',
    config: {
      schema({ zod }) {
        return zod.object({
          // 配置项定义
          message: zod.string().default('Hello'),
        });
      },
    },
  });

  // 2. 注册 Hook
  api.modifyConfig((memo) => {
    // 修改配置
    return memo;
  });

  // 3. 生成临时文件
  api.onGenerateFiles(() => {
    api.writeTmpFile({
      path: 'plugin-myname/runtime.ts',
      content: `
        export function onRouteChange({ route, location }) {
          console.log('${api.config.myname.message}');
        }
      `,
    });
  });

  // 4. 添加运行时插件
  api.addRuntimePlugin(() => ['@@/plugin-myname/runtime.ts']);

  // 5. 添加运行时插件 key
  api.addRuntimePluginKey(() => ['message']);
};
```

### 发布插件

```json
{
  "name": "umi-plugin-myname",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "umi": "^4.0.0"
  },
  "scripts": {
    "build": "father build",
    "prepublishOnly": "npm run build"
  }
}
```

## 插件调试技巧

### 1. 使用 DEBUG 环境变量

```bash
DEBUG=umi:plugin* pnpm dev
```

### 2. 添加日志

```typescript
api.logger.info('插件初始化中...');
api.logger.debug('配置值:', api.config.myname);
```

### 3. 使用 profilePlugins

```bash
pnpm dev --profilePlugins --profilePluginsVerbose
```

### 4. 检查插件注册状态

```typescript
// 在插件中添加断点
console.log('插件已注册:', api.service.plugins[pluginId]);
```

## 总结

Umi 的插件系统是框架的核心竞争力：

1. **灵活的扩展机制** - 通过 Hook 系统与核心交互
2. **清晰的职责划分** - Preset 组织插件，Plugin 实现功能
3. **丰富的 API** - 覆盖配置、文件、命令、生成器等各方面
4. **强大的类型支持** - 完整的 TypeScript 类型定义
5. **活跃的生态** - 丰富的官方和社区插件

掌握插件系统是深入理解 Umi 的关键，也是扩展 Umi 功能的基础。

---

📖 **上一篇**: [整体架构](/architecture/overview)
📖 **下一篇**: [配置系统](/architecture/config-system)