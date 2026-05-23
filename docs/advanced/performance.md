# 性能优化

## 构建优化

### 代码分割

```typescript
export default {
  chainWebpack(memo) {
    memo.optimization
      .splitChunks({
        chunks: 'all',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
          },
        },
      });
    return memo;
  },
};
```

### Tree Shaking

```typescript
export default {
  treeShaking: true,
  esbuildMinify: true,
};
```

## 运行时优化

### 懒加载

```typescript
const LazyComponent = React.lazy(() => import('./Lazy'));
```

### 预加载

```typescript
<link rel="preload" href="/critical.css" as="style" />
```

## 分析工具

```bash
# Bundle 分析
ANALYZE=1 umi build

# 性能分析
umi build --profile
```
