# 类型系统

## 概述

UmiJS 4.x 使用 TypeScript 编写，提供了完善的类型定义。

## 核心类型

### Service 类型

```typescript
export interface IService {
  cwd: string;
  pkg:IPackage;
  paths: IPaths;
  config: IUmiConfig;
  args: yParser.Arguments;
}
```

### 路由类型

```typescript
export interface IRoute {
  path?: string;
  component?: React.ComponentType;
  routes?: IRoute[];
  wrappers?: string[];
  exact?: boolean;
}
```

## 类型导出

```typescript
// .umirc.ts
import type { IConfig } from '@umijs/types';

export default {
  routes: [
    { path: '/', component: '@/pages/index' },
  ],
} as IConfig;
```
