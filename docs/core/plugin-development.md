# Plugin 开发

## 概述

UmiJS 的插件系统基于事件驱动和 Hook 机制

## 插件类型

### 编译时插件

```typescript
// plugin.ts
export default function (api) {
  // 修改配置
  api.modifyConfig((memo) => {
    memo.alias = {
      ...memo.alias,
      '@utils': '@/utils',
    };
    return memo;
  });
  
  // 添加中间件
  api.addMiddleware(() => {
    return async (ctx, next) => {
      await next();
    };
  });
}
```

### 运行时插件

```typescript
// runtime.tsx
export function onRouteChange(opts) {
  console.log('route changed:', opts.location);
}
```

## Preset 开发

```typescript
// preset.ts
export default function (api) {
  return {
    name: 'my-preset',
    
    configs: [
      {
        key: 'myConfig',
        schema: (joi) => joi.object(),
      },
    ],
    
    plugins: [
      require.resolve('./plugin1'),
      require.resolve('./plugin2'),
    ],
  };
}
```