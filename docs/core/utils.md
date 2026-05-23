# 工具函数

## 概述

@umijs/utils 提供了大量工具函数供框架和插件使用。

## 常用工具

### 路径处理

```typescript
import { winPath, join } from '@umijs/utils';
winPath('C:\\Users\\test');  // C:/Users/test
```

### 文件操作

```typescript
import { fsExtra } from '@umijs/utils';
await fsExtra.readFile('./package.json');
```

### 模块解析

```typescript
import { resolve } from '@umijs/utils';
const umiPath = resolve.sync('umi', { basedir: cwd });
```
