# Webpack 打包

## 概述

UmiJS 4.x 支持多种打包器，其中 Webpack 是最成熟和稳定的选择。本文档深入分析 Umi 的 Webpack 打包机制。

## 架构设计

### 模块结构

```
packages/bundler-webpack/src/
├── webpack/
│   ├── config.ts        # Webpack 配置生成
│   ├── webpack.ts       # Webpack 启动逻辑
│   └── plugins/         # 内置插件
├── loaders/
│   └── ...             # 自定义 loaders
└── index.ts            # 入口
```

## Webpack 配置生成

### 主配置结构

```typescript
// packages/bundler-webpack/src/webpack/config.ts

interface IOpts {
  cwd: string;
  config: UmiConfig;
  env: Env;
  bundlerOpts: any;
  entry: Record<string, string[]>;
  importAnalysis?: boolean;
}

export function getConfig(opts: IOpts): Configuration {
  const { cwd, config, env, bundlerOpts, entry } = opts;
  
  const webpackConfig: Configuration = {
    // 1. 基础配置
    entry,
    output: {
      path: join(cwd, config.outputPath || 'dist'),
      filename: getFileHash(config, 'js') ? '[contenthash:8].js' : '[name].js',
      chunkFilename: getFileHash(config, 'js') ? '[contenthash:8].js' : '[name].js',
      publicPath: getPublicPath(config),
      assetModuleFilename: getAssetModuleFilename(config),
    },
    
    // 2. 模式
    mode: env === 'development' ? 'development' : 'production',
    
    // 3. Devtool
    devtool: config.devtool,
    
    // 4. 解析配置
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
      alias: {
        '@': join(cwd, 'src'),
        ...config.alias,
      },
    },
    
    // 5. 模块规则
    module: {
      rules: getRules(opts),
    },
    
    // 6. 插件
    plugins: getPlugins(opts),
    
    // 7. 优化配置
    optimization: getOptimization(config, env),
    
    // 8. 性能提示
    performance: {
      hints: false,
    },
  };
  
  return webpackConfig;
}
```

## 内置 Loaders

### JavaScript/TypeScript 处理

```typescript
{
  test: /\.(ts|js|jsx|tsx|mjs)$/,
  exclude: /node_modules/,
  use: [
    {
      loader: require.resolve('babel-loader'),
      options: {
        presets: [
          [
            require.resolve('@umijs/babel-preset-umi'),
            {
              presetEnv: {},
              presetReact: {},
              presetTypeScript: {},
            },
          ],
        ],
        plugins: [
          // 按需加载插件
          config.extraBabelPlugins || [],
        ].flat(),
      },
    },
  ],
}
```

### CSS 处理

```typescript
// 开发环境
{
  test: /\.css$/,
  use: [
    require.resolve('style-loader'),
    {
      loader: require.resolve('css-loader'),
      options: {
        importLoaders: 1,
        modules: cssModulesConfig,
      },
    },
    require.resolve('postcss-loader'),
  ],
}

// 生产环境
{
  test: /\.css$/,
  use: [
    {
      loader: require.resolve('mini-css-extract-plugin').loader,
    },
    {
      loader: require.resolve('css-loader'),
      options: {
        importLoaders: 1,
        modules: cssModulesConfig,
      },
    },
    require.resolve('postcss-loader'),
  ],
}
```

### 资源文件处理

```typescript
{
  test: /\.(png|jpe?g|gif|svg|webp|ico|bmp|tif|tiff)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: config.inlineLimit || 10000, // 10kb
    },
  },
  generator: {
    filename: getAssetModuleFilename(config),
  },
}
```

## 内置插件

### HTML 插件

```typescript
new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: 'index.html',
  inject: config.scripts?.length ? 'body' : 'head',
  minify: env === 'production' ? {
    removeComments: true,
    collapseWhitespace: true,
    removeRedundantAttributes: true,
  } : false,
  chunks: ['default'],
  ...config.htmlTemplate,
})
```

### CSS 提取插件（生产环境）

```typescript
new MiniCssExtractPlugin({
  filename: getFileHash(config, 'css') ? '[contenthash:8].css' : '[name].css',
  chunkFilename: getFileHash(config, 'css') ? '[contenthash:8].css' : '[name].css',
  ignoreOrder: true,
})
```

### 热更新插件（开发环境）

```typescript
new webpack.HotModuleReplacementPlugin()
```

### 兴安定义插件

```typescript
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(env),
  'process.env.HMR': config.hmr !== false,
  ...config.define,
})
```

## 优化配置

### Tree Shaking

```typescript
optimization: {
  usedExports: true,
  sideEffects: true,
  concatenateModules: config.hash,
}
```

### 代码分割

```typescript
optimization: {
  splitChunks: {
    chunks: 'all',
    minSize: 20000,
    minRemainingSize: 0,
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    enforceSizeThreshold: 50000,
    cacheGroups: {
      defaultVendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10,
        reuseExistingChunk: true,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
}
```

### 运行时代码提取

```typescript
optimization: {
  runtimeChunk: {
    name: 'runtime',
  },
}
```

## 开发服务器

### webpack-dev-middleware

```typescript
import webpackDevMiddleware from '@umijs/bundler-webpack/compiled/webpack-dev-middleware';

const middleware = webpackDevMiddleware(compiler, {
  publicPath: config.publicPath,
  stats: 'errors-warnings',
  writeToDisk: config.devtool === 'source-map',
});
```

### webpack-hot-middleware

```typescript
import webpackHotMiddleware from '@umijs/bundler-webpack/compiled/webpack-hot-middleware';

const hotMiddleware = webpackHotMiddleware(compiler, {
  log: false,
  heartbeat: 2000,
  path: '/__webpack_hmr',
});
```

## 构建统计

### Stats 输出

```typescript
const stats = await compiler.run();

const statsData = stats.toJson({
  all: false,
  assets: true,
  chunks: true,
  modules: true,
  entrypoints: true,
  children: false,
  warnings: true,
  errors: true,
  errorDetails: true,
});
```

### 构建产物分析

```typescript
// 生成 bundle 分析图
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

plugins: [
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    openAnalyzer: false,
    reportFilename: 'report.html',
  }),
]
```

## 自定义扩展

### 添加 Loader

```typescript
// .umirc.ts
export default {
  chainWebpack(memo) {
    memo.module
      .rule('md')
      .test(/\.md$/)
      .use('md-loader')
      .loader(require.resolve('./md-loader'));
    
    return memo;
  },
};
```

### 添加插件

```typescript
// .umirc.ts
export default {
  chainWebpack(memo) {
    memo.plugin('my-plugin').use(MyPlugin, ['arg1']);
    return memo;
  },
};
```

### 修改现有配置

```typescript
// .umirc.ts
export default {
  chainWebpack(memo) {
    // 修改 babel 配置
    memo.module
      .rule('jsx')
      .use('babel-loader')
      .tap(opts => ({
        ...opts,
        plugins: [...opts.plugins, 'my-plugin'],
      }));
    
    return memo;
  },
};
```

## 性能优化建议

### 1. 启用持久化缓存

```typescript
// .umirc.ts
export default {
  webpack5: {
    lazyCompilation: true,
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
  },
};
```

### 2. 限制编译范围

```typescript
export default {
  webpack5: {
    // 忽略不需要编译的目录
    snapshot: {
      managedPaths: [/node_modules/],
    },
  },
};
```

### 3. 使用 ESBuild Loader

```typescript
export default {
  webpack5: {
    useEsbuildLoader: true,  // 需单独安装
  },
};
```

## 与 Vite 对比

| 特性 | Webpack | Vite |
|------|---------|------|
| 冷启动 | 慢 | 快 |
| HMR | 较慢 | 极快 |
| 代码分割 | 完善 | 基础 |
| 生态成熟度 | 高 | 中 |
| 生产优化 | 完善 | 需要配置 |

## 总结

Umi 的 Webpack 打包器提供了：

1. **完善配置** - 开箱即用的生产级配置
2. **灵活扩展** - chainWebpack 支持细粒度定制
3. **生态兼容** - 支持所有 Webpack 插件和 loader
4. **性能优化** - 内置多种优化策略
5. **开发体验** - 热更新、SourceMap 等

---

📖 **上一篇**: [MFSU 实现](/core/mfsu)  
📖 **下一篇**: [Vite 打包](/core/bundler-vite)