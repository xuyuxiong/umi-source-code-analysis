# Micro-frontend (微前端)

## 概述

UmiJS 通过 umi-plugin-qiankun 支持微前端架构。

## Qiankun 集成

### 主应用配置

```typescript
// .umirc.ts
export default {
  qiankun: {
    master: {},
  },
  microApps: [
    {
      name: 'app1',
      entry: '//localhost:8001',
    },
  ],
};
```

### 子应用配置

```typescript
export default {
  qiankun: {
    slave: {},
  },
  base: '/app1',
};
```

## 应用通信

```typescript
// 主应用
import { getMasterApps } from '@umijs/plugin-qiankun/master';

// 子应用
export const qiankun = {
  effects: ['app1'],
};
```
