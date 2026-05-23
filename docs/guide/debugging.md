# 调试指南

## VSCode 调试配置

### 基础调试配置

在项目根目录创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Umi Dev",
      "skipFiles": ["<node_internals>/**"],
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/examples/normal",
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "umi:*",
        "NODE_OPTIONS": "--inspect"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "${workspaceFolder}",
      "protocol": "inspector"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Service.run()",
      "program": "${workspaceFolder}/packages/core/src/service/service.ts",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": {
        "TS_NODE_FILES": "true"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["dev"]
    }
  ]
}
```

### 高级调试配置

对于更复杂的调试场景，可以使用以下配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Build Command",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/examples/normal",
      "runtimeExecutable": "node",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceFolder}/node_modules/.bin/umi",
        "build"
      ],
      "console": "integratedTerminal",
      "restart": true,
      "timeout": 30000
    },
    {
      "name": "Debug MFSU",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/examples/normal",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "mfsu:*",
        "MFSU_DEBUG": "true"
      }
    }
  ]
}
```

## 断点设置技巧

### 1. Service 入口断点

在 `packages/core/src/service/service.ts` 的 `run` 方法开始处设置断点：

```typescript
async run(opts: { name: string; args?: any }) {
  const { name, args = {} } = opts;
  // 👆 在这里设置断点
  
  args._ = args._ || [];
  if (args._[0] === name) args._.shift();
  this.args = args;
  this.name = name;
  
  // 生命周期开始
  this.stage = ServiceStage.init;
  loadEnv({ cwd: this.cwd, envFile: '.env' });
  // ...
}
```

### 2. 插件注册断点

在 `packages/core/src/service/service.ts` 的 `initPlugin` 方法中设置断点：

```typescript
async initPlugin(opts: {
  plugin: Plugin;
  presets?: Plugin[];
  plugins: Plugin[];
}) {
  // 👆 在这里设置断点 - 观察每个插件的注册过程
  
  assert(
    !this.plugins[opts.plugin.id],
    `${opts.plugin.type} ${opts.plugin.id} is already registered...`
  );
  this.plugins[opts.plugin.id] = opts.plugin;
  // ...
}
```

### 3. 配置加载断点

在 `packages/core/src/config/config.ts` 的 `getUserConfig` 方法中设置断点：

```typescript
static getUserConfig(opts: { configFiles: string[] }) {
  // 👆 在这里设置断点 - 观察配置文件的加载过程
  
  let config = {};
  let files: string[] = [];

  for (const configFile of opts.configFiles) {
    if (existsSync(configFile)) {
      register.register({
        implementor: esbuild,
      });
      // 配置文件在这里被加载和合并
      config = lodash.merge(config, require(configFile).default);
      // ...
    }
  }
  return { config, files };
}
```

### 4. 路由生成断点

在 `packages/preset-umi/src/features/tmpFiles/routes.ts` 中设置断点：

```typescript
export async function getRoutes(opts: { api: IApi }) {
  const { api } = opts;
  // 👆 在这里设置断点 - 观察路由生成过程
  
  // 1. 优先使用配置式路由
  if (api.userConfig.routes) {
    return api.userConfig.routes;
  }
  
  // 2. 使用约定式路由
  const routesConvention = new RoutesConvention({
    absPagesPath: api.paths.absPagesPath,
    // ...
  });
  
  return routesConvention.getRoutes();
}
```

## DEBUG 环境变量使用

Umi 使用 `debug` 包提供详细的日志输出。通过设置 `DEBUG` 环境变量可以控制日志输出：

```bash
# 输出所有 Umi 日志
DEBUG=umi:* pnpm dev

# 输出特定模块的日志
DEBUG=umi:config pnpm dev
DEBUG=umi:routes pnpm dev
DEBUG=umi:plugin pnpm dev

# 组合多个模块
DEBUG=umi:config,umi:routes,umi:plugin pnpm dev

# 输出 MFSU 日志
DEBUG=mfsu:* pnpm dev

# 输出 Webpack 日志
DEBUG=webpack:* pnpm dev

# 排除特定模块的日志
DEBUG=umi:*,-umi:verbose pnpm dev
```

### 常用 DEBUG 命名空间

| 命名空间 | 作用 |
|---------|------|
| `umi:*` | 所有 Umi 日志 |
| `umi:config` | 配置加载日志 |
| `umi:routes` | 路由生成日志 |
| `umi:plugin` | 插件注册日志 |
| `umi:build` | 构建日志 |
| `umi:dev` | 开发服务器日志 |
| `mfsu:*` | MFSU 相关日志 |
| `webpack:*` | Webpack 相关日志 |
| `vite:*` | Vite 相关日志 |

## 控制台调试

### 1. 在源码中添加 console.log

在关键位置添加临时日志：

```typescript
// packages/core/src/service/service.ts
async run(opts: { name: string; args?: any }) {
  console.log('🚀 Service.run() started');
  console.log('   name:', opts.name);
  console.log('   args:', JSON.stringify(opts.args, null, 2));
  console.log('   cwd:', this.cwd);
  
  const { name, args = {} } = opts;
  // ...
  
  console.log('📦 Loading user config...');
  this.userConfig = configManager.getUserConfig().config;
  console.log('   userConfig:', JSON.stringify(this.userConfig, null, 2));
  // ...
}
```

### 2. 使用 logger 工具

Umi 提供了内置的 logger 工具：

```typescript
import { logger } from '@umijs/utils';

logger.info('信息消息');
logger.warn('警告消息');
logger.error('错误消息');
logger.debug('调试消息');
logger.ready('准备完成');
logger.event('事件消息');
```

### 3. 使用 chalk 着色输出

```typescript
import { chalk } from '@umijs/utils';

console.log(
  chalk.green('✓'),
  chalk.cyan('Plugin loaded:'),
  chalk.yellow(pluginId)
);
```

## 性能分析

### 1. 插件性能分析

```bash
# 输出所有插件的执行时间
pnpm dev --profilePlugins

# 输出详细性能数据
pnpm dev --profilePlugins --profilePluginsVerbose

# 设置性能阈值 (只输出超过 100ms 的插件)
pnpm dev --profilePlugins --profilePluginsLimit=100
```

输出示例：
```
plugin @umijs/preset-umi 245
       register 32
       hooks {"modifyConfig":[45],"onGenerateFiles":[156]}

plugin @umijs/bundler-webpack 128
       register 18
       hooks {"modifyWebpackConfig":[110]}
```

### 2. 使用 Node.js 性能工具

```bash
# 生成性能剖析文件
node --inspect --prof packages/umi/bin/umi.js dev

# 分析生成的 isolate-*.log 文件
node --prof-process isolate-*.log > profile.txt
```

### 3. 使用 Chrome DevTools

1. 启动带调试标志的进程：
```bash
node --inspect-brk packages/umi/bin/umi.js dev
```

2. 在 Chrome 中打开 `chrome://inspect`

3. 连接到 Node.js 进程

4. 在 Performance 标签页录制性能数据

## 源码阅读辅助技巧

### 1. 生成调用图

使用工具生成函数调用关系：

```bash
# 使用 madge 生成依赖图
pnpm exec madge --image deps.png packages/core/src/

# 使用 ts-node 直接运行源码
pnpm exec ts-node -r tsconfig-paths/register <script>
```

### 2. 使用 TypeScript 类型导航

在 VSCode 中：
- `F12` - 跳转到定义
- `Shift+F12` - 查看所有引用
- `Ctrl+T` - 查看类型定义
- `Ctrl+Shift+T` - 查看类型实现

### 3. 代码搜索技巧

使用 `rg` (ripgrep) 快速搜索：

```bash
# 搜索 exports
rg "export (class|function|const) Service" packages/core/src/

# 搜索 Hook 调用
rg "applyPlugins\(" packages/preset-umi/src/

# 搜索特定 Hook 的使用
rg "onGenerateFiles" packages/

# 搜索类型定义
rg "interface IApi" packages/
```

## 常见问题排查

### 问题 1: 插件不生效

**排查步骤**:

1. 检查插件是否注册成功
```bash
DEBUG=umi:plugin pnpm dev
```

2. 检查插件的 `enableBy` 条件
```typescript
// 在 Service.isPluginEnable() 中添加断点
isPluginEnable(hook: Hook | string) {
  const { id, key, enableBy } = plugin;
  debugger; // 观察 enableBy 的返回值
  // ...
}
```

3. 检查 Hook 是否正确注册
```bash
DEBUG=umi:hooks pnpm dev
```

### 问题 2: 配置不生效

**排查步骤**:

1. 检查配置文件是否被加载
```bash
DEBUG=umi:config pnpm dev
```

2. 检查配置验证逻辑
```typescript
// 在 Config.validateConfig() 中添加断点
static validateConfig(opts: { config: any; schemas: ISchema }) {
  debugger; // 观察配置值和 schema
  // ...
}
```

3. 检查配置合并顺序
```typescript
// 配置合并优先级: defaultConfig < userConfig
this.config = lodash.merge(defaultConfig, config);
```

### 问题 3: 路由生成异常

**排查步骤**:

1. 检查路由生成过程
```bash
DEBUG=umi:routes pnpm dev
```

2. 检查 pages 目录结构
```bash
tree src/pages/
```

3. 检查 route.ts 生成内容
```bash
cat src/.umi/core/route.tsx
```

### 问题 4: 构建速度慢

**排查步骤**:

1. 使用性能分析
```bash
pnpm dev --profilePlugins --profilePluginsVerbose
```

2. 检查 MFSU 状态
```bash
DEBUG=mfsu:* pnpm dev
```

3. 检查依赖编译
```bash
DEBUG=mfsu:dep pnpm dev
```

## 调试 Checklist

在开始调试前，确保：

- [ ] 已安装所有依赖 (`pnpm install`)
- [ ] 已构建所有包 (`pnpm build`)
- [ ] 已配置 VSCode 调试 (`.vscode/launch.json`)
- [ ] 了解目标模块的源码位置
- [ ] 准备好调试用的示例项目

调试过程中：

- [ ] 合理设置断点，不要一次设置太多
- [ ] 使用 DEBUG 环境变量输出详细日志
- [ ] 观察变量和调用栈，理解执行流程
- [ ] 必要时添加临时 console.log
- [ ] 记录调试发现和解决方案

---

📖 **下一篇**: [整体架构](/architecture/overview)