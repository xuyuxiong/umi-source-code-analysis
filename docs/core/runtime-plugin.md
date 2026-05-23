# 运行时插件

## 概述

运行时插件在浏览器端执行，用于扩展应用运行时的行为。

## 核心插件

### onRouteChange

```typescript
export function onRouteChange(opts) {
  const { location, action } = opts;
  console.log('路由变化:', location.pathname);
}
```

### onPatchRoutes

```typescript
export function onPatchRoutes(opts) {
  const { routes } = opts;
  // 修改路由配置
  return routes;
}
```

### modifyClientRenderOpts

```typescript
export function modifyClientRenderOpts(opts) {
  const { rootContainer, container } = opts;
  return {
    ...opts,
    rootContainer,
  };
}
```

## 插件注册

```typescript
// .umirc.ts
export default {
  plugins: [
    './plugins/runtime.ts',
  ],
};
```
