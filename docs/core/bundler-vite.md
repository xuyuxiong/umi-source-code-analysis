# Vite 打包

## 概述

Vite 是 UmiJS 4.x 支持的新一代构建工具，利用浏览器原生 ES Module 提供极速的开发体验。本文档深入分析 Umi 的 Vite 打包集成。

## 架构设计

### 模块结构

```
packages/bundler-vite/src/
├── vite/
│   ├── config.ts        # Vite 配置生成
│   ├── vite.ts          # Vite 启动逻辑
│   └── plugins/         # Vite 插件
├── index.ts            # 入口
└── types.ts            # 类型定义
```

## Vite 配置生成

### 主配置结构

```typescript
// packages/bundler-vite/src/vite/config.ts

interface IOpts {
  cwd: string;
  config: UmiConfig;
  env: Env;
  entry: Record<string, string>;
}

export async function getConfig(opts: IOpts): Promise<InlineConfig> {
  const { cwd, config, env, entry } = opts;
  
  const viteConfig: InlineConfig = {
    // 1. 根目录
    root: cwd,
    
    // 2. 基础路径
    base: config.publicPath || '/',
    
    // 3. 模式
    mode: env,
    
    // 4. 解析配置
    resolve: {
      alias: {
        '@': join(cwd, 'src'),
        ...config.alias,
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    },
    
    // 5. 入口
    build: {
      rollupOptions: {
        input: entry,
      },
      outDir: config.outputPath || 'dist',
      assetsDir: 'static',
    },
    
    // 6. CSS 配置
    css: {
      modules: {
        localsConvention: config.cssModules?.localsConvention,
        generateScopedName: config.cssModules?.generateScopedName,
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          ...config.lessLoader,
        },
      },
    },
    
    // 7. 插件
    plugins: await getPlugins(opts),
    
    // 8. 服务器配置（开发环境）
    server: {
      port: config.port || 8000,
      host: config.host || '0.0.0.0',
      https: config.https,
      hmr: config.hmr !== false,
    },
  };
  
  return viteConfig;
}
```

## Vite 插件系统

### Umi 插件适配

```typescript
// packages/bundler-vite/src/vite/plugins/umi.ts

export function umiPlugin(opts: {
  config: UmiConfig;
  cwd: string;
}): Plugin {
  return {
    name: 'umi:vite-plugin',
    
    // 配置钩子
    config(config, env) {
      return {
        define: {
          'process.env.NODE_ENV': JSON.stringify(env.mode),
          'process.env.HMR': JSON.stringify(opts.config.hmr !== false),
          ...opts.config.define,
        },
      };
    },
    
    // 转换钩子
    async transform(code, id) {
      if (/\.tsx?$/.test(id)) {
        // TypeScript 转译
        return babelTransform(code, id);
      }
      return null;
    },
    
    // HTML 转换
    transformIndexHtml(html, ctx) {
      return modifyHTML(html, ctx);
    },
  };
}
```

### 虚拟模块插件

```typescript
import type { Plugin } from 'vite';

export function virtualModulePlugin(): Plugin {
  const virtualModules: Record<string, string> = {};
  
  return {
    name: 'umi:virtual-modules',
    
    resolveId(id) {
      if (id.startsWith('virtual:')) {
        return `\0${id}`;
      }
      return null;
    },
    
    load(id) {
      if (id.startsWith('\0virtual:')) {
        return virtualModules[id.replace('\0virtual:', '')];
      }
      return null;
    },
    
    // 供其他插件注册虚拟模块
    api: {
      registerVirtualModule(path: string, content: string) {
        virtualModules[path] = content;
      },
    },
  };
}
```

## 开发服务器

### HMR 实现

Vite 的 HMR 通过 WebSocket 实现：

```typescript
// Vite 内部实现
import { createServer } from 'vite';

const server = await createServer({
  server: {
    hmr: {
      protocol: 'ws:',
      host: 'localhost',
      port: 24678,
      path: '/__vite_hmr',
    },
  },
});

await server.listen();
```

### 中间件模式

```typescript
// 集成到 Umi 服务
import { createServer } from 'vite';

const viteServer = await createServer(viteConfig);

// 作为中间件使用
app.use(viteServer.middlewares);

// HMR 监听
viteServer.ws.on('connection', (client) => {
  client.send({
    type: 'connected',
  });
});
```

## 生产构建

### 构建命令

```typescript
import { build } from 'vite';

async function buildApp(opts: {
  config: InlineConfig;
  watch?: boolean;
}) {
  const result = await build({
    ...opts.config,
    build: {
      ...opts.config.build,
      watch: opts.watch ? {} : null,
    },
  });
  
  return result;
}
```

### 代码分割策略

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd'],
        },
      },
    },
  },
};
```

### 预加载优化

```typescript
// 生成 preload 链接
export function preloadPlugin(): Plugin {
  return {
    name: 'umi:preload',
    generateBundle(opts, bundle) {
      for (const file in bundle) {
        if (file.endsWith('.html')) {
          const chunk = bundle[file] as OutputAsset;
          const html = chunk.source as string;
          
          // 添加 preload 链接
          const preloadLinks = generatePreloadLinks(bundle);
          chunk.source = html.replace('</head>', `${preloadLinks}</head>`);
        }
      }
    },
  };
}
```

## CSS 处理

### CSS Modules

```typescript
// .umirc.ts
export default {
  cssModules: {
    localsConvention: 'camelCase',  // camelCase | asIs
    generateScopedName: '[local]_[hash:base64:5]',
  },
};
```

### 预处理器

```typescript
// Less 支持
export default {
  lessLoader: {
    modifyVars: {
      '@primary-color': '#1DA57A',
    },
    javascriptEnabled: true,
  },
};

// Sass 支持
export default {
  sass: {
    implementation: require('sass'),
  },
};
```

### PostCSS 插件

```typescript
// postcss.config.js
export default {
  plugins: {
    autoprefixer: {},
    'postcss-pxtorem': {
      rootValue: 16,
      propList: ['*'],
    },
  },
};
```

## 资源处理

### 静态资源限制

```typescript
export default {
  assetsInclude: [
    '**/*.png',
    '**/*.jpg',
    '**/*.svg',
    '**/*.mp4',
  ],
  build: {
    assetsInlineLimit: 10000, // 10kb
  },
};
```

### 资源路径处理

```typescript
// Vite 使用新的 URL 处理
import imgUrl from './assets/logo.png';

// 或者使用 ?url 后缀
import imgUrl from './assets/logo.png?url';

// 使用 ?raw 导入原始内容
import rawSvg from './assets/logo.svg?raw';
```

## 环境变量

### 环境文件

```
.env                # 所有环境
.env.development    # 开发环境
.env.production     # 生产环境
.env.test           # 测试环境
```

### 使用方式

```typescript
// .env.development
VITE_API_URL=http://localhost:8080
VITE_APP_TITLE=My App Dev

// 代码中使用
console.log(import.meta.env.VITE_API_URL);
console.log(import.meta.env.VITE_APP_TITLE);
```

### 环境变量类型

```typescript
// vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## 性能优化

### 1. 依赖预构建

```typescript
export default {
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd'],
    exclude: ['@internal/pkg'],
  },
};
```

### 2. 按需加载

```typescript
// 动态导入
const Chart = () => import('./Chart');

// 带 chunk 名
const Chart = () => import(/* webpackChunkName: "chart" */ './Chart');
```

### 3. 缓存策略

```typescript
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
  },
};
```

## SSR 支持

### Vite SSR 配置

```typescript
// vite.config.ts
export default {
  ssr: {
    noExternal: ['@umijs/runtime'],
  },
  build: {
    ssr: true,
    rollupOptions: {
      input: 'src/server.ts',
    },
  },
};
```

### 服务端渲染

```typescript
// server.ts
import { renderToString } from 'react-dom/server';

export async function render(url: string) {
  const app = await import('./App');
  return renderToString(app.default);
}
```

## 与 Webpack 对比

| 特性 | Vite | Webpack |
|------|------|---------|
| 冷启动 | 极快（ms 级） | 较慢（s 级） |
| HMR | 原生快速 | 需要重新编译 |
| 生产构建 | Rollup | Webpack |
| 代码分割 | 基础 | 完善 |
| 生态 | 发展中 | 成熟 |
| CSS 支持 | 原生 | 需要 loader |
| 类型检查 | 需要额外配置 | ts-loader/fork-ts |

## 最佳实践

### 1. 大型项目优化

```typescript
export default {
  // 大型项目建议
  optimizeDeps: {
    // 预构建大型依赖
    include: ['react', 'react-dom', 'antd', '@ant-design/icons'],
    // 排除频繁变动的本地包
    exclude: ['@internal/*'],
  },
  
  // 构建优化
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('antd')) return 'antd-vendor';
          }
        },
      },
    },
  },
};
```

### 2. 调试配置

```bash
# 启用详细日志
DEBUG=vite:* umi dev

# 查看预构建依赖
ls node_modules/.vite/deps
```

### 3. 旧浏览器支持

```typescript
export default {
  build: {
    target: 'es2015',  // 默认 'modules'
  },
};
```

## 迁移指南

### 从 Webpack 迁移

1. **移除 webpack 相关配置**
   - `chainWebpack`
   - `configureWebpack`

2. **替换 Vite 配置**
   - `vite` 配置项
   
3. **更新 HMR 接受代码**
   - Webpack: `module.hot.accept()`
   - Vite: `import.meta.hot.accept()`

4. **环境变量前缀**
   - Webpack: `process.env.XXX`
   - Vite: `import.meta.env.VITE_XXX`

## 常见问题

### Q: 某些 npm 包无法使用

添加 `optimizeDeps.include`：

```typescript
export default {
  optimizeDeps: {
    include: ['problematic-package'],
  },
};
```

### Q: 路径别名不生效

配置 `resolve.alias`：

```typescript
export default {
  resolve: {
    alias: {
      '@': '/src',
    },
  },
};
```

### Q: HMR 不工作

检查 WebSocket 连接：

```bash
# 确保端口开放
netstat -an | grep 24678
```

## 总结

Umi 的 Vite 打包器提供了：

1. **极速启动** - 利用 ESM 原生支持
2. **高效 HMR** - 基于文件路径的增量更新
3. **Rollup 构建** - 更小的生产包体积
4. **现代化 API** - `import.meta` 系列 API
5. **生态兼容** - 支持 Rollup 插件

---

📖 **上一篇**: [Webpack 打包](/core/bundler-webpack)  
📖 **下一篇**: [ESBuild 打包](/core/bundler-esbuild)