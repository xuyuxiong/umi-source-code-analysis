# 配置系统

## 概述

Umi 的配置系统负责加载、验证和合并用户配置，是框架初始化的重要环节。配置系统的设计遵循以下原则：

1. **约定优于配置** - 默认配置满足大部分场景
2. **类型安全** - 完整的 TypeScript 类型支持
3. **插件扩展** - 配置项由插件定义
4. **灵活合并** - 支持多层配置覆盖

## 配置文件

### 配置文件位置

Umi 按以下优先级查找配置文件：

```
项目根目录/
├── .umirc.ts              # 主配置文件 (最高优先级)
├── .umirc.*.ts            # 环境特定配置
│   ├── .umirc.development.ts
│   ├── .umirc.production.ts
│   └── .umirc.<env>.ts
├── config/
│   └── config.ts          # 备选配置文件
└── config/
    └── config.*.ts        # 备选环境配置
```

### 环境特定配置

Umi 支持通过环境变量自动加载特定配置：

```bash
# 设置环境
UMI_ENV=dev    # 加载 .umirc.dev.ts
UMI_ENV=test   # 加载 .umirc.test.ts

# 内置环境
# APP_ENV=development  -> .umirc.development.ts
# APP_ENV=production   -> .umirc.production.ts
```

配置合并优先级：
```
.umirc.ts < .umirc.<UMI_ENV>.ts < .umirc.<APP_ENV>.ts < .umirc.<APP_ENV>.<UMI_ENV>.ts
```

### 示例配置

```typescript
// .umirc.ts
import { defineConfig } from 'umi';

export default defineConfig({
  // 基础配置
  title: '我的应用',
  base: '/app/',
  publicPath: '/',
  
  // 路由配置
  routes: [
    { path: '/', component: 'index' },
    { path: '/about', component: 'about' },
  ],
  
  // 插件配置
  antd: {},
  dva: {},
  qiankun: {
    master: {},
  },
  
  // 构建配置
  mfsu: {},
  vite: {},  // 启用 Vite
  ssr: {},   // 启用 SSR
  
  // 开发配置
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
  
  // 其他配置
  hash: true,
  sourcemap: true,
  analyze: {},
});
```

## 配置加载流程

### 源码实现

```typescript
// packages/core/src/config/config.ts

export class Config {
  public mainConfigFile: string | null;
  
  constructor(opts: IOpts) {
    this.mainConfigFile = Config.getMainConfigFile(this.opts);
  }

  // 获取用户配置
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

  // 获取配置文件列表
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
        ...[
          mainConfigFile,
          specifiedEnv && addExt({ file: mainConfigFile, ext: `.${specifiedEnv}` }),
          addExt({ file: mainConfigFile, ext: `.${env}` }),
          specifiedEnv && addExt({
            file: mainConfigFile,
            ext: `.${env}.${specifiedEnv}`,
          }),
        ].filter(Boolean),
      );

      // 开发环境支持 .local 后缀
      if (opts.env === Env.development) {
        ret.push(addExt({ file: mainConfigFile, ext: LOCAL_EXT }));
      }
    }
    return ret;
  }

  // 加载并合并配置
  static getUserConfig(opts: { configFiles: string[] }) {
    let config = {};
    let files: string[] = [];

    for (const configFile of opts.configFiles) {
      if (existsSync(configFile)) {
        // 使用 esbuild 注册 TypeScript loader
        register.register({
          implementor: esbuild,
        });
        register.clearFiles();
        
        try {
          // 加载并合并配置
          config = lodash.merge(config, require(configFile).default);
        } catch (e) {
          throw new Error(`Parse config file failed: [${configFile}]`, {
            cause: e,
          });
        }
        
        // 记录依赖文件 (用于热更新)
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
}
```

### 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                       配置加载流程                               │
└─────────────────────────────────────────────────────────────────┘

  1. 查找主配置文件
     ┌────────────────────┐
     │ getMainConfigFile  │
     │ - .umirc.ts        │
     │ - config/config.ts │
     └─────────┬──────────┘
               │
               ▼
  2. 生成配置文件列表
     ┌────────────────────┐
     │ getConfigFiles     │
     │ - .umirc.ts        │
     │ - .umirc.dev.ts    │
     │ - .umirc.development.ts │
     └─────────┬──────────┘
               │
               ▼
  3. 加载配置文件
     ┌────────────────────┐
     │ getUserConfig      │
     │ - esbuild 注册 loader │
     │ - require() 加载  │
     │ - lodash.merge 合并│
     └─────────┬──────────┘
               │
               ▼
  4. 验证配置
     ┌────────────────────┐
     │ validateConfig     │
     │ - schema 验证      │
     │ - 未知 key 检查     │
     └─────────┬──────────┘
               │
               ▼
  5. 应用插件修改
     ┌────────────────────┐
     │ modifyConfig Hook  │
     │ modifyDefaultConfig│
     └──────────┬─────────┘
                │
                ▼
  最终配置生成
```

## 配置验证

### Schema 定义

每个配置项由插件定义其 schema。Umi 支持 Zod 和 Joi 两种 schema 定义方式。

```typescript
// 插件中定义配置 schema
api.describe({
  key: 'myPlugin',
  config: {
    schema({ zod, joi }) {
      // 使用 Zod (推荐)
      return zod.object({
        option1: zod.string().default('default'),
        option2: zod.number().min(0).max(100).optional(),
        option3: zod.boolean().default(false),
        option4: zod.array(zod.string()).optional(),
        nested: zod.object({
          key1: zod.string(),
          key2: zod.number(),
        }).optional(),
      });
      
      // 或使用 Joi
      // return joi.object({
      //   option1: joi.string().default('default'),
      //   ...
      // });
    },
  },
});
```

### 验证实现

```typescript
// packages/core/src/config/config.ts

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
  
  // 验证失败抛出错误
  assert(
    errors.size === 0,
    `Invalid config values: ${Array.from(errors.keys()).join(', ')}
${Array.from(errors.keys()).map((key) => {
  return `Invalid value for ${key}:\n${errors.get(key)!.message}`;
})}`,
  );
  
  // 检查未知配置项
  assert(
    configKeys.size === 0,
    `Invalid config keys: ${Array.from(configKeys).join(', ')}`,
  );
}
```

## 配置合并

### 合并策略

最终配置由三层合并而成：

```
defaultConfig (插件默认值)
    ↓ lodash.merge
userConfig (用户配置)
    ↓ applyPlugins('modifyConfig')
modifiedConfig (插件修改后)
```

### 源码实现

```typescript
// packages/core/src/service/service.ts

async resolveConfig() {
  // 1. 应用 modifyConfig Hook
  const config = await this.applyPlugins({
    key: 'modifyConfig',
    initialValue: lodash.cloneDeep(
      this.configManager!.getConfig({
        schemas: this.configSchemas,
      }).config,
    ),
    args: { paths: this.paths },
  });
  
  // 2. 应用 modifyDefaultConfig Hook
  const defaultConfig = await this.applyPlugins({
    key: 'modifyDefaultConfig',
    initialValue: lodash.cloneDeep(this.configDefaults),
  });
  
  // 3. 合并配置 (defaultConfig 为基底)
  this.config = lodash.merge(defaultConfig, config);

  return { config, defaultConfig };
}
```

## 配置变更监听

### onChange 类型

```typescript
// packages/core/src/types.ts

export enum ConfigChangeType {
  // 重新加载配置
  reload = 'reload',
  
  // 重新生成临时文件
  regenerateTmpFiles = 'regenerateTmpFiles',
  
  // 重新生成路由
  regenerateRoutes = 'regenerateRoutes',
  
  // 重新构建
  regenerateEntry = 'regenerateEntry',
}
```

### 定义变更类型

```typescript
api.describe({
  key: 'alias',
  config: {
    schema: ({ zod }) => zod.record(zod.string()),
    onChange: ConfigChangeType.regenerateTmpFiles,
  },
});

api.describe({
  key: 'routes',
  config: {
    schema: ({ zod }) => zod.array(zod.any()).optional(),
    onChange: ConfigChangeType.regenerateRoutes,
  },
});
```

### 变更处理流程

```typescript
// packages/core/src/config/config.ts

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
      ...this.files,  // 配置文件
      ...(this.mainConfigFile
        ? []
        : getAbsFiles({
            files: this.opts.defaultConfigFiles || DEFAULT_CONFIG_FILES,
            cwd: this.opts.cwd,
          })),
    ],
    { ignoreInitial: true, cwd: this.opts.cwd }
  );
  
  watcher.on(
    'all',
    lodash.debounce(async (event, path) => {
      // 重新加载配置
      const { config: origin } = this.prevConfig;
      const { config: updated, files } = this.getConfig({
        schemas: opts.schemas,
      });
      
      // 计算变更
      const data = Config.diffConfigs({
        origin,
        updated,
        onChangeTypes: opts.onChangeTypes,
      });
      
      // 触发变更处理
      await opts.onChange({ data, event, path });
    }, WATCH_DEBOUNCE_STEP),
  );
  
  return () => watcher.close();
}
```

## 内置配置项

### 应用配置

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `title` | string | 页面标题 |
| `base` | string | 路由 base 路径 |
| `publicPath` | string | 静态资源前缀 |
| `mountElementId` | string | 挂载元素 ID |
| `history` | object | 路由历史类型 |

### 路由配置

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `routes` | array | 配置式路由 |
| `conventionRoutes` | object | 约定式路由配置 |
| `exportStatic` | object | 静态导出配置 |

### 构建配置

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `hash` | boolean/string | 文件名 hash |
| `devtool` | string | Source map 类型 |
| `minify` | boolean | 代码压缩 |
| `mfsu` | object | MFSU 加速 |
| `vite` | object | Vite 配置 |

### 开发配置

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `proxy` | object | 代理配置 |
| `mock` | object | Mock 数据 |
| `port` | number | 开发端口 |
| `host` | string | 开发主机 |

## 环境变量

### UMI_ENV

用于区分不同的部署环境：

```bash
# 开发环境
UMI_ENV=dev umi dev

# 测试环境
UMI_ENV=test umi build

# 生产环境
UMI_ENV=prod umi build
```

### APP_ENV

用于区分应用状态（development/production）：

```bash
# 开发模式 (默认)
APP_ENV=development

# 生产模式
APP_ENV=production
```

### 自定义环境变量

通过 `.env` 文件定义：

```bash
# .env
API_URL=http://localhost:8080
DEBUG=true

# .env.dev
API_URL=http://dev.api.com

# .env.prod
API_URL=https://api.example.com
```

在代码中使用：

```typescript
// .umirc.ts
export default {
  define: {
    'process.env.API_URL': process.env.API_URL,
  },
};
```

## 配置 TypeScript 类型

### 自定义配置类型

```typescript
// .umirc.ts
import { defineConfig } from 'umi';

export default defineConfig({
  // 智能提示和类型检查
  title: 'My App',
  mfsu: {
    strategy: 'normal',
  },
});
```

### 扩展配置类型

```typescript
// src/typings.d.ts
import 'umi/typing';

declare module 'umi' {
  interface IConfig {
    myCustomOption?: string;
    myPlugin?: {
      enabled: boolean;
      config: object;
    };
  }
}
```

## 总结

Umi 的配置系统设计精良，具有以下特点：

1. **灵活的配置方式** - 支持多种配置文件和环境
2. **强大的类型支持** - 完整的 TypeScript 类型定义
3. **插件驱动** - 配置项由插件定义
4. **热更新支持** - 配置变更自动生效
5. **严格的验证** - Schema 验证确保配置正确

掌握配置系统是使用和开发 Umi 插件的基础。

---

📖 **上一篇**: [插件系统](/architecture/plugin-system)
📖 **下一篇**: [路由系统](/architecture/routing-system)