# 配置加载

## 概述

UmiJS 的配置系统支持多种配置文件格式、环境变量区分和热重载功能。本文档深入分析配置加载机制。

## 配置类结构

### packages/core/src/config/config.ts

Config 类负责管理所有配置相关的逻辑。

```typescript
interface IOpts {
  cwd: string;
  env: Env;
  specifiedEnv?: string;
  defaultConfigFiles?: string[];
}

export class Config {
  public opts: IOpts;
  public mainConfigFile: string | null;
  public prevConfig: any;
  public files: string[] = [];
  
  constructor(opts: IOpts) {
    this.opts = opts;
    this.mainConfigFile = Config.getMainConfigFile(this.opts);
    this.prevConfig = null;
  }
}
```

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `opts` | IOpts | 配置选项 |
| `mainConfigFile` | string \| null | 主配置文件路径 |
| `prevConfig` | any | 上一次的配置（用于热重载对比） |
| `files` | string[] | 所有配置文件列表 |

## 配置文件优先级

### 默认配置文件列表

```typescript
// packages/core/src/constants.ts

export const DEFAULT_CONFIG_FILES = [
  `.umirc.ts`,
  `.umirc.js`,
  `config/config.ts`,
  `config/config.js`,
];
```

### 环境相关文件

Config 支持基于环境和指定环境的多配置文件：

```typescript
static getConfigFiles(opts: {
  mainConfigFile: string | null;
  env: Env;
  specifiedEnv?: string;
}) {
  const ret: string[] = [];
  const { mainConfigFile } = opts;
  const specifiedEnv = opts.specifiedEnv || '';
  
  if (mainConfigFile) {
    const env = SHORT_ENV[opts.env] || opts.env;
    ret.push(
      // 基础配置文件
      mainConfigFile,
      
      // 指定环境变量配置
      specifiedEnv &&
        addExt({ file: mainConfigFile, ext: `.${specifiedEnv}` }),
      
      // 环境配置（.development, .production）
      addExt({ file: mainConfigFile, ext: `.${env}` }),
      
      // 组合环境配置
      specifiedEnv &&
        addExt({
          file: mainConfigFile,
          ext: `.${env}.${specifiedEnv}`,
        }),
    ).filter(Boolean);

    // 开发环境本地配置
    if (opts.env === Env.development) {
      ret.push(addExt({ file: mainConfigFile, ext: LOCAL_EXT }));
    }
  }
  return ret;
}
```

### 配置文件加载顺序示例

假设主配置文件为 `.umirc.ts`，环境为 `development`，`UMI_ENV=prod`：

```
1. .umirc.ts                  # 基础配置
2. .umirc.prod.ts             # 指定环境配置 (UMI_ENV=prod)
3. .umirc.development.ts      # 开发环境配置
4. .umirc.development.prod.ts # 组合配置
5. .umirc.local.ts            # 本地配置（仅 dev 环境）
```

后面的配置会覆盖前面的配置。

## 配置文件读取

### getUserConfig()

```typescript
getUserConfig() {
  const configFiles = Config.getConfigFiles({
    mainConfigFile: this.mainConfigFile,
    env: this.opts.env,
    specifiedEnv: this.opts.specifiedEnv,
  });
  
  return Config.getUserConfig({
    configFiles: getAbsFiles({
      files: configFiles,
      cwd: this.opts.cwd,
    }),
  });
}
```

### getUserConfig() 静态方法

```typescript
static getUserConfig(opts: { configFiles: string[] }) {
  let config = {};
  let files: string[] = [];

  for (const configFile of opts.configFiles) {
    if (existsSync(configFile)) {
      // 1. 注册 esbuild 用于 TypeScript 转译
      register.register({
        implementor: esbuild,
      });
      register.clearFiles();
      
      try {
        // 2. 合并配置（后面的覆盖前面的）
        config = lodash.merge(config, require(configFile).default);
      } catch (e) {
        // 3. 错误处理（支持 Node 版本差异）
        if (semver.lt(semver.clean(process.version)!, '16.9.0')) {
          throw e;
        }
        throw new Error(`Parse config file failed: [${configFile}]`, {
          cause: e,
        });
      }
      
      // 4. 清理缓存
      for (const file of register.getFiles()) {
        delete require.cache[file];
      }
      files.push(...register.getFiles());
      register.restore();
    } else {
      files.push(configFile);
    }
  }

  return { config, files };
}
```

### 关键点

1. **使用 esbuild 转译** - 支持 TypeScript 配置文件
2. **lodash.merge 合并** - 深度合并多个配置
3. **缓存清理** - 避免 require.cache 污染
4. **文件追踪** - 记录所有依赖文件用于热重载

## 配置验证

### validateConfig()

使用 Joi 或 Zod schema 验证配置：

```typescript
static validateConfig(opts: { config: any; schemas: ISchema }) {
  const errors = new Map<string, Error>();
  const configKeys = new Set(Object.keys(opts.config));
  
  for (const key of Object.keys(opts.schemas)) {
    configKeys.delete(key);
    if (!opts.config[key]) continue;
    
    const schema = opts.schemas[key]({ ...joi, zod });
    
    if (joi.isSchema(schema)) {
      // Joi schema 验证
      const { error } = schema.validate(opts.config[key]);
      if (error) errors.set(key, error);
    } else {
      // Zod schema 验证
      assert(
        isZodSchema(schema),
        `schema for config ${key} is not valid, neither joi nor zod.`,
      );
      const { error } = schema.safeParse(opts.config[key]);
      if (error) errors.set(key, error);
    }
  }
  
  // 验证错误
  assert(
    errors.size === 0,
    `Invalid config values: ${Array.from(errors.keys()).join(', ')}
    ${Array.from(errors.keys()).map((key) => {
      return `Invalid value for ${key}:\n${errors.get(key)!.message}`;
    })}`,
  );
  
  // 无效的配置键
  assert(
    configKeys.size === 0,
    `Invalid config keys: ${Array.from(configKeys).join(', ')}`,
  );
}
```

## 配置热重载

### watch() 方法

```typescript
watch(opts: {
  schemas: ISchema;
  onChangeTypes: IOnChangeTypes;
  onChange: (opts: {
    data: ReturnType<typeof Config.diffConfigs>;
    event: string;
    path: string;
  }) => Promise<void>;
}) {
  const watcher = chokidar.watch(
    [
      ...this.files,
      ...(this.mainConfigFile
        ? []
        : getAbsFiles({
            files: this.opts.defaultConfigFiles || DEFAULT_CONFIG_FILES,
            cwd: this.opts.cwd,
          })),
    ],
    {
      ignoreInitial: true,
      cwd: this.opts.cwd,
    },
  );
  
  watcher.on(
    'all',
    lodash.debounce((event, path) => {
      // 1. 获取旧配置
      const { config: origin } = this.prevConfig;
      
      // 2. 重新读取配置
      const { config: updated, files } = this.getConfig({
        schemas: opts.schemas,
      });
      
      // 3. 更新监听文件
      watcher.add(files);
      
      // 4. 计算配置差异
      const data = Config.diffConfigs({
        origin,
        updated,
        onChangeTypes: opts.onChangeTypes,
      });
      
      // 5. 触发回调
      opts.onChange({ data, event, path });
    }, WATCH_DEBOUNCE_STEP),
  );
  
  return () => watcher.close();
}
```

### 配置差异计算

```typescript
static diffConfigs(opts: {
  origin: any;
  updated: any;
  onChangeTypes: IOnChangeTypes;
}) {
  const patch = diff(opts.origin, opts.updated);
  const changes: Record<string, string[]> = {};
  const fns: Function[] = [];
  
  for (const item of patch) {
    const key = item.path[0];
    const onChange = opts.onChangeTypes[key];
    assert(onChange, `Invalid onChange config for key ${key}`);
    
    if (typeof onChange === 'string') {
      // 预定义的改变类型（如 reload, regenerateTmpFiles）
      changes[onChange] ||= [];
      changes[onChange].push(String(key));
    } else if (typeof onChange === 'function') {
      // 自定义处理函数
      fns.push(onChange);
    }
  }
  
  return { changes, fns };
}
```

## 获取主配置文件

### getMainConfigFile()

```typescript
static getMainConfigFile(opts: {
  cwd: string;
  defaultConfigFiles?: string[];
}) {
  let mainConfigFile = null;
  
  for (const configFile of opts.defaultConfigFiles || DEFAULT_CONFIG_FILES) {
    const absConfigFile = join(opts.cwd, configFile);
    if (existsSync(absConfigFile)) {
      mainConfigFile = absConfigFile;
      break;
    }
  }
  
  return mainConfigFile;
}
```

按优先级查找第一个存在的配置文件。

## 环境变量

### 环境变量类型

```typescript
// packages/core/src/types.ts

export enum Env {
  development = 'development',
  production = 'production',
  test = 'test',
}
```

### SHORT_ENV 映射

```typescript
// packages/core/src/constants.ts

export const SHORT_ENV: Record<string, string> = {
  dev: 'development',
  prod: 'production',
  test: 'test',
};
```

### 指定环境变量

通过 `UMI_ENV` 环境变量指定：

```bash
# 使用 .umirc.prod.ts
UMI_ENV=prod umi dev

# 使用 .umirc.test.ts
UMI_ENV=test umi build
```

### 本地配置

`.umirc.local.ts` 仅在开发环境下生效，用于本地开发配置，不应提交到代码仓库。

## 配置获取

### getConfig()

```typescript
getConfig(opts: { schemas: ISchema }) {
  const { config, files } = this.getUserConfig();
  Config.validateConfig({ config, schemas: opts.schemas });
  this.files = files;
  return (this.prevConfig = {
    config: config,
    files,
  });
}
```

返回最终合并并验证后的配置。

## 示例

### 基础配置

```typescript
// .umirc.ts
export default {
  routes: {
    '/': { component: '@/pages/index' },
  },
  plugins: ['@umijs/plugins/dist/dva'],
};
```

### 环境配置

```typescript
// .umirc.development.ts
export default {
  mfsu: false,
  devtool: 'source-map',
};

// .umirc.production.ts
export default {
  mfsu: { production: {} },
  devtool: false,
};
```

### 本地配置（不提交）

```typescript
// .umirc.local.ts
export default {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
};
```

## 总结

Umi 的配置系统设计灵活且强大：

1. **多文件支持** - `.umirc.ts`、`config/config.ts` 等多种格式
2. **环境区分** - 支持 `NODE_ENV` 和 `UMI_ENV` 双重环境变量
3. **本地配置** - `.local` 后缀文件用于本地开发
4. **热重载** - chokidar 监听配置变化，自动重新加载
5. **类型验证** - Joi/Zod schema 双重验证
6. **缓存清理** - 自动清理 require.cache 避免污染

---

📖 **上一篇**: [命令行架构](/core/cli)  
📖 **下一篇**: [路由生成](/core/route-generation)