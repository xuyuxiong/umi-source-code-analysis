# 自定义打包器

## 概述

UmiJS 允许扩展自定义打包器。

## 打包器接口

```typescript
interface IBundler {
  getConfig(opts: any): Promise<any>;
  build(opts: any): Promise<any>;
}
```

## 实现示例

```typescript
// my-bundler.ts
export class MyBundler {
  async getConfig(opts) {
    return {
      entry: opts.entry,
      output: opts.output,
    };
  }
  
  async build(opts) {
    // 构建逻辑
  }
}
```

## 注册打包器

```typescript
// .umirc.ts
export default {
  bundler: 'my-bundler',
};
```
