# 命令行架构

## 概述

UmiJS 的命令行系统采用了基于 spectrum 的命令行解析器，支持各种命令和参数。本文档深入分析 Umi 的 CLI 架构、命令注册和参数解析机制。

## 入口文件

### packages/umi/src/cli/cli.ts

CLI 的入口文件主要负责：

1. 检查 Node.js 版本
2. 解析命令行参数
3. 启动服务

```typescript
// packages/umi/src/cli/cli.ts

import {
  catchUnhandledRejection,
  checkVersion as checkNodeVersion,
  logger,
  printHelp,
  yParser,
} from '@umijs/utils';
import { DEV_COMMAND, FRAMEWORK_NAME, MIN_NODE_VERSION } from '../constants';
import { Service } from '../service/service';
import { dev } from './dev';

export async function run(opts?: IOpts) {
  // 1. 检查 Node.js 版本
  checkNodeVersion(MIN_NODE_VERSION);
  
  // 2. 解析命令行参数
  const args = yParser(process.argv.slice(2), {
    alias: {
      version: ['v'],
      help: ['h'],
    },
    boolean: ['version'],
  });
  
  const command = args._[0];
  
  // 3. 设置环境变量
  const FEATURE_COMMANDS = ['mfsu', 'setup', 'deadcode'];
  if ([DEV_COMMAND, ...FEATURE_COMMANDS].includes(command)) {
    process.env.NODE_ENV = 'development';
  } else if (command === 'build') {
    process.env.NODE_ENV = 'production';
  }
  
  // 4. 执行命令
  if (command === DEV_COMMAND) {
    dev();
  } else {
    try {
      await new Service().run2({
        name: args._[0],
        args,
      });
    } catch (e: any) {
      logger.fatal(e);
      printHelp.exit();
      process.exit(1);
    }
  }
}
```

### yParser 参数解析

`yParser` 是基于 `yargs-parser` 的命令行参数解析器，支持：

- 短参数别名：`-v` 代表 `--version`
- 布尔值：`--version` 会被解析为 `true`
- 位置参数：通过 `args._` 获取

```typescript
const args = yParser(process.argv.slice(2), {
  alias: {
    version: ['v'],
    help: ['h'],
  },
  boolean: ['version'],
});

// 示例：umi build --foo --bar=baz src/index.ts
// 结果：
// {
//   _: ['build', 'src/index.ts'],
//   foo: true,
//   bar: 'baz'
// }
```

## Service 类

### packages/umi/src/service/service.ts

`Service` 类继承自 `@umijs/core` 的 `CoreService`，是 Umi 框架的核心引擎。

```typescript
import { Service as CoreService } from '@umijs/core';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { DEFAULT_CONFIG_FILES, FRAMEWORK_NAME } from '../constants';
import { getCwd } from './cwd';

export class Service extends CoreService {
  constructor(opts?: any) {
    process.env.UMI_DIR = dirname(require.resolve('../../package'));
    const cwd = getCwd();
    
    // 加载依赖钩子
    require('./requireHook');
    
    super({
      ...opts,
      env: process.env.NODE_ENV,
      cwd,
      defaultConfigFiles: opts?.defaultConfigFiles || DEFAULT_CONFIG_FILES,
      frameworkName: opts?.frameworkName || FRAMEWORK_NAME,
      presets: [require.resolve('@umijs/preset-umi'), ...(opts?.presets || [])],
      plugins: [
        existsSync(join(cwd, 'plugin.ts')) && join(cwd, 'plugin.ts'),
        existsSync(join(cwd, 'plugin.js')) && join(cwd, 'plugin.js'),
      ].filter(Boolean),
    });
  }

  async run2(opts: { name: string; args?: any }) {
    let name = opts.name;
    
    // 处理版本和帮助命令
    if (opts?.args.version || name === 'v') {
      name = 'version';
    } else if (opts?.args.help || !name || name === 'h') {
      name = 'help';
    }

    return await this.run({ ...opts, name });
  }
}
```

### 构造函数解析

1. **设置 UMI_DIR**: 指向当前 Umi 包的根目录
2. **获取当前工作目录**: 通过 `getCwd()` 支持 `APP_ROOT` 环境变量
3. **加载依赖钩子**: `requireHook` 确保模块解析正确
4. **配置 Presets 和 Plugins**:
   - 默认加载 `@umijs/preset-umi`
   - 支持用户自定义 `plugin.ts` 和 `plugin.js`

### run2() 方法

`run2()` 是 Umi 对 `run()` 方法的扩展，主要处理：

- 版本命令（`v` 或 `--version`）
- 帮助命令（`h` 或 `--help`）
- 特殊命令别名处理

## 命令执行流程

```
用户输入：umi build --foo
    ↓
1. yParser 解析参数
    ↓
2. Service.run2() 处理命令名
    ↓
3. Service.run() 执行生命周期
    ↓
4. 命令函数执行
```

## 内置命令

### dev 命令

开发环境命令，设置 `NODE_ENV=development`：

```typescript
// packages/umi/src/cli/dev.ts

export function dev() {
  process.env.NODE_ENV = 'development';
  // 启动开发服务器
}
```

### build 命令

生产环境构建命令：

```typescript
// 执行时自动设置
process.env.NODE_ENV = 'production';
```

### 特殊命令列表

```typescript
const FEATURE_COMMANDS = ['mfsu', 'setup', 'deadcode'];
```

这些命令会强制设置 `NODE_ENV=development`。

## 错误处理

### catchUnhandledRejection

捕获未处理的 Promise rejection：

```typescript
catchUnhandledRejection();
```

确保异步错误不会被吞掉。

### 异常捕获

```typescript
try {
  await new Service().run2({ name, args });
} catch (e: any) {
  logger.fatal(e);  // 输出致命错误
  printHelp.exit(); // 打印帮助信息并退出
  process.exit(1);  // 错误退出码
}
```

## 环境变量处理

### UMI_DIR

指向 Umi 包的安装目录：

```typescript
process.env.UMI_DIR = dirname(require.resolve('../../package'));
```

### UMI_PRESETS

允许用户自定义 Presets：

```typescript
if (opts?.presets) {
  process.env[`${FRAMEWORK_NAME}_PRESETS`.toUpperCase()] =
    opts.presets.join(',');
}
```

## 示例

### 查看版本

```bash
umi v
umi --version
umi build --version  # 查看 build 命令版本
```

### 开发模式

```bash
umi dev
umi dev --port 8080  # 自定义端口
umi dev --https      # 启用 HTTPS
```

### 生产构建

```bash
umi build
umi build --watch    # 监听模式
```

### 自定义 Presets

```bash
UMI_PRESETS=my-preset umi dev
```

## 生命周期阶段

CLI 执行过程中经历以下阶段：

1. **uninitialized** - 未初始化
2. **init** - 初始化
3. **initPresets** - 初始化 Presets
4. **initPlugins** - 初始化 Plugins
5. **resolveConfig** - 解析配置
6. **collectAppData** - 收集应用数据
7. **onCheck** - 检查阶段
8. **onStart** - 启动阶段
9. **runCommand** - 执行命令

相关源码参见：[Service 类](/core/app-service)

## 总结

Umi 的 CLI 架构设计清晰，主要特点：

1. **yParser 解析** - 灵活的命令行参数解析
2. **Service 驱动** - 统一的生命周期管理
3. **命令别名** - 支持短命令（`v`, `h`）
4. **错误处理** - 完善的异常捕获和日志输出
5. **环境变量** - 支持环境变量配置 Presets

---

📖 **上一篇**: [App 服务](/core/app-service)  
📖 **下一篇**: [配置加载](/core/config-loading)