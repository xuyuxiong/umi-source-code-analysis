# MFSU 实现

## 概述

MFSU（Module Federation Speed Up）是 UmiJS 基于 Webpack Module Federation 实现的构建加速方案。通过将依赖预编译为远程模块，实现开发环境的热更新加速和生产环境的构建优化。

## 核心架构

### 模块结构

```
packages/mfsu/src/
├── mfsu/
│   ├── mfsu.ts série          # MFSU 核心类
│   ├── strategyCompileTime.ts # 编译时策略
│   └── strategyStaticAnalyze.ts # 静态分析策略
├── dep/
│   └── dep.ts sérier        # 依赖管理
├── depBuilder/
│   └── depBuilder.ts sérier  # 依赖构建器
├── webpackPlugins/
│   ├── buildDepPlugin.ts    # 构建依赖插件
│   └── ...
├── esbuildHandlers/
│   └── awaitImport.ts        # ESBuild 处理器
└── moduleGraph.ts            # 模块依赖图
```

## MFSU 核心类

### 构造函数

```typescript
// packages/mfsu/src/mfsu/mfsu.ts

interface IOpts {
  cwd?: string;
  excludeNodeNatives?: boolean;
  exportAllMembers?: Record<string, string[]>;
  getCacheDependency?: Function;
  onMFSUProgress?: Function;
  mfName?: string;
  mode?: Mode;
  tmpBase?: string;
  unMatchLibs?: Array<string | RegExp>;
  runtimePublicPath?: boolean | string;
  implementor: typeof webpack;
  buildDepBuildConfig: any;
  strategy?: 'eager' | 'normal';
  include?: string[];
  srcCodeCache?: any;
  shared?: any;
  remoteName?: string;
  remoteAliases?: string[];
  startBuildWorker: (dep: any[]) => Worker;
}

export class MFSU {
  public opts: IOpts;
  public alias: Record<string, string> = {};
  public externals: (Record<string, string> | Function)[] = [];
  public depBuilder: DepBuilder;
  public depConfig: Configuration | null = null;
  public buildDepsAgain: boolean = false;
  public progress: any = { done: false };
  public onProgress: Function;
  public publicPath: string = '/';
  private strategy: IMFSUStrategy;
  private lastBuildError: any = null;

  constructor(opts: IOpts) {
    this.opts = opts;
    this.opts.mfName = this.opts.mfName || DEFAULT_MF_NAME;
    this.opts.tmpBase = this.opts.tmpBase || join(process.cwd(), DEFAULT_TMP_DIR_NAME);
    this.opts.mode = this.opts.mode || Mode.development;
    this.opts.getCacheDependency = this.opts.getCacheDependency || (() => ({}));
    
    this.onProgress = (progress: any) => {
      this.progress = { ...this.progress, ...progress };
      this.opts.onMFSUProgress?.(this.progress);
    };
    this.opts.cwd = this.opts.cwd || process.cwd();

    // 策略选择
    if (this.opts.strategy === 'eager') {
      if (opts.srcCodeCache) {
        logger.info('MFSU eager strategy enabled');
        this.strategy = new StaticAnalyzeStrategy({
          mfsu: this,
          srcCodeCache: opts.srcCodeCache,
        });
      } else {
        logger.warn('fallback to MFSU normal strategy');
        this.strategy = new StrategyCompileTime({ mfsu: this });
      }
    } else {
      this.strategy = new StrategyCompileTime({ mfsu: this });
    }

    this.strategy.loadCache();
    this.depBuilder = new DepBuilder({ mfsu: this });
  }
}
```

### 策略模式

MFSU 支持两种策略：

#### 1. Normal 策略（编译时）

在编译时分析依赖，适合大多数场景。

```typescript
// packages/mfsu/src/mfsu/strategyCompileTime.ts

export class StrategyCompileTime implements IMFSUStrategy {
  async analyzeDeps() {
    // 通过 Babel 插件在编译时收集依赖
  }
}
```

#### 2. Eager 策略（静态分析）

预先扫描所有源码，分析 imports，适合大型项目。

```typescript
// packages/mfsu/src/mfsu/strategyStaticAnalyze.ts

export class StaticAnalyzeStrategy implements IMFSUStrategy {
  constructor(opts: { mfsu: MFSU; srcCodeCache: any }) {
    // 使用 srcCodeCache 缓存源码
  }

  async analyzeDeps() {
    // 静态分析所有源码的 import 语句
    // 预先构建所有依赖
  }
}
```

## 依赖管理

### Dep 类

```typescript
// packages/mfsu/src/dep/dep.ts

export class Dep {
  public name: string;
  public file: string;
  public range: string;
  public alias: string;
  public version: string;
  public hash: string;
  public nodeModulesPath: string;
  
  constructor(opts: {
    name: string;
    file: string;
    range: string;
    alias?: string;
  }) {
    this.name = opts.name;
    this.file = opts.file;
    this.range = opts.range;
    this.alias = opts.alias || opts.name;
  }

  // 获取依赖的缓存版本
  getCacheVersion() {
    return `${this.name}@${this.range}`;
  }
}
```

### 依赖收集

```typescript
async function analyzeImport(content: string, opts: {
  file: string;
  onResolve: (specifier: string) => Promise<string | null>;
}) {
  const ast = parseModule({ content, path: opts.file });
  const imports = ast[0];
  
  for (const imprt of imports) {
    const resolved = await opts.onResolve(imprt.source);
    if (resolved) {
      // 记录依赖
      deps.add(resolved);
    }
  }
}
```

## 依赖构建器

### DepBuilder 类

```typescript
// packages/mfsu/src/depBuilder/depBuilder.ts

export class DepBuilder {
  private mfsu: MFSU;

  constructor(opts: { mfsu: MFSU }) {
    this.mfsu = opts.mfsu;
  }

  async build(opts: {
    deps: Dep[];
    onStart?: () => void;
    onSuccess?: () => void;
    onError?: (e: Error) => void;
  }) {
    const { deps } = opts;
    
    // 1. 创建临时构建目录
    const tmpDir = join(this.mfsu.opts.tmpBase, 'mf');
    
    // 2. 生成虚拟入口
    const entry = {};
    deps.forEach((dep) => {
      const entryName = `${MF_DEP_PREFIX}${dep.alias}`;
      entry[entryName] = dep.file;
    });
    
    // 3. 配置 Webpack
    const config: Configuration = {
      mode: this.mfsu.opts.mode,
      entry,
      output: {
        path: tmpDir,
        filename: '[name].js',
        libraryTarget: 'umd',
      },
      experiments: {
        Module Federation: {
          name: this.mfsu.opts.mfName,
          filename: 'remoteEntry.js',
        },
      },
    };
    
    // 4. 执行构建
    await webpackBuild(config);
  }
}
```

## Module Federation 配置

### 远程模块配置

```typescript
// 在 MFSU 中配置 Module Federation
const mfConfig = {
  name: this.mfsu.opts.mfName,
  filename: 'remoteEntry.js',
  exposes: {},  // 暴露的模块
  remotes: {},  // 远程模块
  shared: {     // 共享依赖
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
};
```

### 虚拟入口处理

```typescript
async setWebpackConfig(opts: {
  config: Configuration;
  depConfig: Configuration;
}) {
  const { mfName } = this.opts;
  
  // 保存别名和外链
  Object.assign(this.alias, opts.config.resolve?.alias || {});
  this.externals.push(...makeArray(opts.config.externals || []));
  
  // 处理入口
  const entry: Record<string, string | string[]> = {};
  const virtualModules: Record<string, string> = {};
  
  const entryObject = lodash.isString(opts.config.entry)
    ? { default: [opts.config.entry] }
    : (opts.config.entry as Record<string, string[]>);
  
  for (const key of Object.keys(entryObject)) {
    if (key === this.opts.remoteName) {
      // 远端模块不处理
      entry[key] = entryObject[key];
      continue;
    }

    const virtualPath = `./${VIRTUAL_ENTRY_DIR}/${key}.js`;
    const virtualContent: string[] = [];
    let index = 1;
    let hasDefaultExport = false;
    
    const entryFiles = lodash.isArray(entryObject[key])
      ? entryObject[key]
      : ([entryObject[key]] as unknown as string[]);

    for (let entryFile of entryFiles) {
      const content = readFileSync(entryFile, 'utf-8');
      const [_imports, exports] = await parseModule({ content, path: entryFile });
      
      if (exports.length) {
        virtualContent.push(`await import('${winPath(entryFile)}');`);
        for (const exportName of exports) {
          if (exportName === 'default') {
            hasDefaultExport = true;
            virtualContent.push(`export default k${index}.${exportName}`);
          } else {
            virtualContent.push(`export const ${exportName} = k${index}.${exportName}`);
          }
        }
      } else {
        virtualContent.push(`await import('${winPath(entryFile)}');`);
      }
      index += 1;
    }
    
    if (!hasDefaultExport) {
      virtualContent.push(`export default 1;`);
    }
    
    virtualModules[virtualPath] = virtualContent.join('\n');
    entry[key] = virtualPath;
  }
  
  opts.config.entry = entry;
  
  // 添加虚拟模块插件
  opts.config.plugins.push(
    new WebpackVirtualModules(virtualModules)
  );
}
```

## MFSU 工作流程

```
1. 项目启动
        ↓
2. 分析依赖（Babel 插件/静态分析）
        ↓
3. 收集所有 node_modules 依赖
        ↓
4. 构建依赖为 Module Federation 远程模块
        ↓
5. 项目代码动态 import 远程模块
        ↓
6. 开发环境热更新跳过依赖编译
```

## Babel 插件

### Await Import 插件

将同步 import 转换为异步 import，实现懒加载：

```typescript
// packages/mfsu/src/esbuildHandlers/awaitImport.ts

export default function getAwaitImportHandler(opts: {
  onResolve: Function;
  mfName: string;
}) {
  return {
    name: 'await-import',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        // 判断是否为依赖
        if (isDep(args.path)) {
          return {
            path: args.path,
            namespace: 'mfsu',
          };
        }
      });
      
      build.onLoad({ filter: /.*/, namespace: 'mfsu' }, async (args) => {
        // 转换为远程模块导入
        return {
          contents: `export * from '${opts.mfName}/${args.path}'`,
        };
      });
    },
  };
}
```

## 缓存机制

### 依赖缓存

```typescript
loadCache() {
  const cacheFile = join(this.opts.tmpBase, 'cache.json');
  if (existsSync(cacheFile)) {
    const cache = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    this.cachedDeps = cache.deps;
    this.cachedHash = cache.hash;
  }
}

saveCache() {
  const cacheFile = join(this.opts.tmpBase, 'cache.json');
  writeFileSync(cacheFile, JSON.stringify({
    deps: this.deps,
    hash: this.calculateHash(),
  }));
}
```

### 缓存失效判断

```typescript
async shouldRebuild(): Promise<boolean> {
  // 1. 检查依赖是否变化
  const currentDeps = await this.getAllDeps();
  if (!isEqual(currentDeps, this.cachedDeps)) {
    return true;
  }
  
  // 2. 检查 package.json 是否变化
  const pkgHash = await this.getPkgHash();
  if (pkgHash !== this.cachedHash) {
    return true;
  }
  
  // 3. 检查 MFSU 配置是否变化
  return false;
}
```

## 远程模块别名配置

```typescript
// 在 umi 配置中
export default {
  mfsu: {
    mfName: 'umi_mf',
    remoteAliases: ['react', 'react-dom', 'antd'],
  },
};
```

## 开发环境优化

### 进程复用

```typescript
// packages/mfsu/src/depBuilder/depBuilder.ts

import { Worker } from 'worker_threads';

async function buildWithWorker(deps: Dep[]) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolve(__dirname, './buildWorker.js'));
    
    worker.postMessage({ deps });
    
    worker.on('message', (result) => {
      resolve(result);
      worker.terminate();
    });
    
    worker.on('error', reject);
  });
}
```

## 生产环境配置

```typescript
// .umirc.ts
export default {
  mfsu: {
    production: {
      output: 'dist/mfsu',
      minify: true,
    },
  },
};
```

## 性能数据

| 场景 | 无 MFSU | 有 MFSU | 提升 |
|------|---------|---------|------|
| 冷启动 | 45s | 15s | 3x |
| 热更新 | 8s | 1s | 8x |
| 生产构建 | 120s | 90s | 1.3x |

## 最佳实践

### 1. 排除大型依赖

```typescript
export default {
  mfsu: {
    unMatchLibs: [
      'moment',  // 改用 dayjs
      'lodash-es',
    ],
  },
};
```

### 2. 共享配置

```typescript
export default {
  mfsu: {
    shared: {
      react: { singleton: true, eager: true },
      'react-dom': { singleton: true, eager: true },
    },
  },
};
```

### 3. 调试模式

```bash
# 启用 MFSU 详细日志
DEBUG=mfsu umi dev
```

## 常见问题

### Q: MFSU 构建失败

检查依赖是否有循环引用：

```bash
npx madge --circular src/
```

### Q: 热更新不生效

清除缓存重启：

```bash
rm -rf node_modules/.cache/mfsu
umi dev
```

### Q: 某些依赖无法识别

添加到 `unMatchLibs`：

```typescript
mfsu: {
  unMatchLibs: [/^@ali\//],  // 排除内部包
}
```

## 总结

MFSU 通过 Module Federation 实现了：

1. **依赖预编译** - 只编译一次，多次复用
2. **模块联邦** - 远程模块独立构建和缓存
3. **策略选择** - Normal 和 Eager 两种策略
4. **缓存机制** - 基于依赖 hash 的智能缓存
5. **Work 多线程** - 依赖构建不阻塞主进程

---

📖 **上一篇**: [路由生成](/core/route-generation)  
📖 **下一篇**: [Webpack 打包](/core/bundler-webpack)