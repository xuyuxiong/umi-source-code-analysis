# ESBuild 打包

## 概述

ESBuild 是一个极速的 JavaScript 打包器和压缩器，由 Go 编写。UmiJS 4.x 集成了 ESBuild 用于开发环境打包和生产构建。本文档深入分析 Umi 的 ESBuild 打包实现。

## 架构设计

### 模块结构

```
packages/bundler-esbuild/src/
├── esbuild/
│   ├── config.ts        # ESBuild 配置生成
│   ├── esbuild.ts       # ESBuild 启动逻辑
│   └── plugins/         # ESBuild 插件
├── index.ts            # 入口
└── types.ts            # 类型定义
```

## ESBuild 核心配置

### 主配置结构

```typescript
// packages/bundler-esbuild/src/esbuild/config.ts

import type { BuildOptions } from 'esbuild';

interface IOpts {
  cwd: string;
  config: UmiConfig;
  env: Env;
  entry: Record<string, string>;
}

export function getConfig(opts: IOpts): BuildOptions {
  const { cwd, config, env, entry } = opts;
  
  const esbuildConfig: BuildOptions = {
    // 1. 入口
    entryPoints: entry,
    
    // 2. 输出目录
    outdir: join(cwd, config.outputPath || 'dist'),
    
    // 3. 打包格式
    format: config.chainWebpack ? 'cjs' : 'esm',
    platform: 'browser',
    target: config.targets || 'es2015',
    
    // 4. 打包模式
    bundle: true,
    splitting: config.splitchunks !== false,
    
    // 5. 元数据
    metafile: true,
    
    // 6. SourceMap
    sourcemap: config.devtool !== false,
    
    // 7. 压缩配置（生产环境）
    minify: env === 'production',
    minifyWhitespace: env === 'production',
    minifyIdentifiers: env === 'production',
    minifySyntax: env === 'production',
    
    // 8. 树摇
    treeShaking: true,
    
    // 9. 路径解析
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    
    // 10. 别名
    alias: {
      '@': join(cwd, 'src'),
      ...config.alias,
    },
    
    // 11. 定义常量
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
      'process.env.HMR': JSON.stringify(config.hmr !== false),
      ...config.define,
    },
    
    // 12. 加载器
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx',
      '.json': 'json',
      '.svg': 'dataurl',
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.gif': 'dataurl',
    },
    
    // 13. 外部模块
    external: config.externals || [],
    
    // 14. 日志级别
    logLevel: 'info',
    
    // 15. 增量构建（开发环境）
    incremental: env === 'development',
    
    // 16. 插件
    plugins: getPlugins(opts),
    
    // 17. 主要字段
    mainFields: ['browser', 'module', 'main'],
  };
  
  return esbuildConfig;
}
```

## ESBuild 插件系统

### 自定义插件

```typescript
// packages/bundler-esbuild/src/esbuild/plugins/umi.ts

import type { Plugin, PluginBuild, OnResolveArgs, OnLoadArgs } from 'esbuild';

export function umiPlugin(opts: {
  config: UmiConfig;
  cwd: string;
}): Plugin {
  return {
    name: 'umi-esbuild-plugin',
    
    setup(build: PluginBuild) {
      const { config, cwd } = opts;
      
      // 1. 解析钩子
      build.onResolve({ filter: /.*/ }, async (args: OnResolveArgs) => {
        // 处理别名
        if (args.path.startsWith('@/')) {
          return {
            path: join(cwd, 'src', args.path.slice(2)),
          };
        }
        
        // 处理虚拟模块
        if (args.path.startsWith('virtual:')) {
          return {
            path: args.path,
            namespace: 'virtual',
          };
        }
        
        return null;
      });
      
      // 2. 加载钩子
      build.onLoad({ filter: /\.tsx?$/, namespace: 'virtual' }, async (args: OnLoadArgs) => {
        return {
          contents: generateVirtualModule(args.path),
          loader: 'ts',
        };
      });
      
      // 3. 转换钩子
      build.onLoad({ filter: /\.tsx?$/ }, async (args: OnLoadArgs) => {
        const contents = await readFile(args.path, 'utf-8');
        
        // TypeScript 转译
        const result = await transform(contents, {
          loader: 'tsx',
          jsx: 'automatic',
        });
        
        return {
          contents: result.code,
          loader: 'js',
        };
      });
      
      // 4. HTML 处理
      build.onLoad({ filter: /\.html$/ }, async (args: OnLoadArgs) => {
        const html = await readFile(args.path, 'utf-8');
        return {
          contents: modifyHTML(html),
          loader: 'text',
        };
      });
    },
  };
}
```

### CSS 处理插件

```typescript
export function cssPlugin(opts: {
  cssModules?: boolean;
  less?: boolean;
  sass?: boolean;
}): Plugin {
  return {
    name: 'css-plugin',
    setup(build) {
      // CSS 文件
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const contents = await readFile(args.path, 'utf-8');
        
        if (opts.cssModules) {
          // CSS Modules 处理
          const { css, identifiers } = await processCSSModules(contents);
          return {
            contents: generateCSSModule(css, identifiers),
            loader: 'js',
          };
        }
        
        return {
          contents: `export default \`${contents}\``,
          loader: 'js',
        };
      });
      
      // Less 文件
      if (opts.less) {
        build.onLoad({ filter: /\.less$/ }, async (args) => {
          const contents = await readFile(args.path, 'utf-8');
          const css = await renderLess(contents, args.path);
          return {
            contents: `export default \`${css}\``,
            loader: 'js',
          };
        });
      }
    },
  };
}
```

## 开发服务器

### 本地服务器

```typescript
// packages/bundler-esbuild/src/esbuild/dev.ts

import { context } from 'esbuild';
import express from 'express';

export async function startDevServer(opts: {
  entry: Record<string, string>;
  config: BuildOptions;
}) {
  // 1. 创建开发服务器
  const app = express();
  
  // 2. 创建 ESBuild 上下文
  const ctx = await context({
    ...opts.config,
    sourcemap: 'inline',
  });
  
  // 3. 监听模式
  await ctx.watch();
  
  // 4. 提供构建结果
  app.use(async (req, res) => {
    const result = await ctx.rebuild();
    
    if (result.errors.length > 0) {
      res.status(500).send(formatErrors(result.errors));
      return;
    }
    
    const js = result.outputFiles.find(f => f.path.endsWith('.js'));
    res.type('application/javascript');
    res.send(js.text);
  });
  
  app.listen(8000);
}
```

### HMR 实现

```typescript
// HMR 插件
export function hmrPlugin(): Plugin {
  return {
    name: 'hmr-plugin',
    setup(build) {
      let ws: WebSocket | null = null;
      
      build.onEnd(async (result) => {
        if (ws && result.errors.length === 0) {
          ws.send(JSON.stringify({
            type: 'update',
            updates: result.metafile.outputs,
          }));
        }
      });
      
      // WebSocket 服务器
      const wss = new WebSocket.Server({ port: 24678 });
      wss.on('connection', (client) => {
        ws = client;
        client.send(JSON.stringify({ type: 'connected' }));
      });
    },
  };
}
```

## 生产构建

### 构建命令

```typescript
// packages/bundler-esbuild/src/esbuild/build.ts

import { build } from 'esbuild';

export async function buildApp(opts: {
  config: BuildOptions;
  watch?: boolean;
}) {
  const result = await build({
    ...opts.config,
    
    // 生产环境优化
    minify: true,
    treeShaking: true,
    
    // 分割代码
    splitting: true,
    
    // 如果启用 watch 模式
    watch: opts.watch ? {
      onRebuild(error, result) {
        if (error) {
          console.error('Watch build failed:', error);
        } else {
          console.log('Watch build succeeded');
        }
      },
    } : false,
  });
  
  return result;
}
```

### 代码分割

```typescript
// 代码分割配置
export function getSplittedConfig(opts: {
  entry: Record<string, string>;
}): BuildOptions {
  return {
    ...opts,
    
    // 启用代码分割
    splitting: true,
    
    // 入口 chunk 名
    entryNames: '[dir]/[name]-[hash]',
    
    // chunk 名
    chunkNames: 'chunks/[name]-[hash]',
    
    // 资源名
    assetNames: 'assets/[ext]/[name]-[hash]',
    
    // 元数据
    metafile: true,
  };
}
```

### 元数据分析

```typescript
// 分析构建结果
import { analyzeMetafile } from 'esbuild-visualizer';

async function analyzeBuild(result: BuildResult) {
  if (!result.metafile) return;
  
  const stats = await analyzeMetafile(result.metafile);
  
  console.log('Bundle size:', stats.totalSize);
  console.log('Modules:', stats.modules.length);
  
  // 输出最大的模块
  const largest = stats.modules
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  console.log('Largest modules:');
  largest.forEach(m => {
    console.log(`  ${m.name}: ${(m.size / 1024).toFixed(2)} KB`);
  });
}
```

## 性能优化

### 缓存机制

```typescript
// 文件系统缓存
export function cachePlugin(): Plugin {
  const cacheDir = join(process.cwd(), 'node_modules/.cache/esbuild');
  
  return {
    name: 'cache-plugin',
    setup(build) {
      // 读取缓存
      build.onLoad({ filter: /.*/ }, async (args) => {
        const cacheKey = hash(args.path);
        const cacheFile = join(cacheDir, cacheKey);
        
        if (existsSync(cacheFile)) {
          return {
            contents: await readFile(cacheFile),
            loader: 'js',
          };
        }
        
        return null;
      });
      
      // 写入缓存
      build.onEnd(async (result) => {
        for (const file of result.outputFiles) {
          const cacheKey = hash(file.path);
          const cacheFile = join(cacheDir, cacheKey);
          await writeFile(cacheFile, file.text);
        }
      });
    },
  };
}
```

### 并行构建

```typescript
// 多入口并行构建
export async function parallelBuild(opts: {
  entries: Record<string, BuildOptions>;
}) {
  const promises = Object.entries(opts.entries).map(async ([name, config]) => {
    const result = await build(config);
    return { name, result };
  });
  
  const results = await Promise.all(promises);
  return results;
}
```

## 高级用法

### 自定义加载器

```typescript
// Markdown 加载器
export function mdLoader(): Plugin {
  return {
    name: 'md-loader',
    setup(build) {
      build.onLoad({ filter: /\.md$/ }, async (args) => {
        const content = await readFile(args.path, 'utf-8');
        const html = await md.render(content);
        
        return {
          contents: `
            export default \`
              <div class="markdown-body">
                ${html}
              </div>
            \`,
          `,
          loader: 'js',
        };
      });
    },
  };
}
```

### 条件编译

```typescript
// 根据环境定义不同代码
export default {
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    __VERSION__: JSON.stringify(pkg.version),
  },
};

// 代码中
if (__DEV__) {
  console.log('Development mode');
}
```

### 虚拟模块

```typescript
// 虚拟模块
const virtualModules = {
  'virtual:routes': `
    export const routes = [
      { path: '/', component: () => import('@/pages/index') },
      { path: '/users', component: () => import('@/pages/users') },
    ];
  `,
};

export function virtualModulePlugin(): Plugin {
  return {
    name: 'virtual-modules',
    setup(build) {
      build.onResolve({ filter: /^virtual:/ }, (args) => ({
        path: args.path,
        namespace: 'virtual',
      }));
      
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => ({
        contents: virtualModules[args.path] || '',
        loader: 'js',
      }));
    },
  };
}
```

## 性能对比

| 操作 | ESBuild | Webpack | Vite |
|------|---------|---------|------|
| 冷启动 | ~50ms | ~5s | ~100ms |
| 热更新 | ~20ms | ~1s | ~50ms |
| 生产构建 | ~2s | ~10s | ~3s |
| 最小化 | ~100ms | ~2s | ~150ms |

## 与 Webpack 配置对比

### Webpack 配置

```typescript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin(),
  ],
};
```

### ESBuild 配置

```typescript
// esbuild.config.js
export default {
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
  plugins: [
    htmlPlugin(),
  ],
};
```

## 最佳实践

### 1. 开发环境配置

```typescript
export default {
  sourcemap: 'inline',
  incremental: true,
  logLevel: 'info',
};
```

### 2. 生产环境配置

```typescript
export default {
  minify: true,
  treeShaking: true,
  splitting: true,
  metafile: true,
};
```

### 3. Library 构建

```typescript
export default {
  format: 'esm',
  platform: 'neutral',
  outExtension: { '.js': '.mjs' },
};
```

## 调试技巧

### 查看详细日志

```bash
# 设置日志级别
esbuild --loglevel=debug

# 输出元数据
esbuild --metafile=meta.json

# 分析构建
npx esbuild-visualizer meta.json
```

### SourceMap 调试

```typescript
export default {
  sourcemap: 'linked',  // linked | inline | external | both
  sourceRoot: '/src',
};
```

## 常见问题

### Q: 某些 npm 包报错

添加 `banner` 解决：

```typescript
export default {
  banner: {
    js: `
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
    `,
  },
};
```

### Q: CSS 无法导入

使用插件处理：

```typescript
import cssPlugin from 'esbuild-style-plugin';

export default {
  plugins: [cssPlugin()],
};
```

### Q: Node.js 包无法使用

配置 `platform` 和 `fallback`：

```typescript
export default {
  platform: 'node',
  define: {
    global: 'globalThis',
  },
};
```

## 总结

Umi 的 ESBuild 打包器提供了：

1. **极速构建** - Go 语言实现，比 Webpack 快 10-100 倍
2. **开箱即用** - TypeScript/JSX/CSS 原生支持
3. **插件系统** - 兼容 Rollup 插件 API
4. **开发体验** - HMR、SourceMap、增量构建
5. **生产优化** - Tree-shaking、代码分割、压缩

---

📖 **上一篇**: [Vite 打包](/core/bundler-vite)  
📖 **下一篇**: [React 渲染器](/core/renderer-react)