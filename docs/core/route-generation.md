# 路由生成

## 概述

UmiJS 支持两种路由配置方式：约定式路由（Convention）和声明式路由（Config）。本文档深入分析路由生成的内部机制。

## 路由系统架构

### 核心模块

```
packages/core/src/route/
├── route.ts           # 路由主入口
├── routesConvention.ts # 约定式路由
├── routesConfig.ts    # 声明式路由
├── defineRoutes.ts    # 路由定义工具
├── routeUtils.ts      # 路由工具函数
└── utils.ts          # 通用工具
```

## 约定式路由

### getConventionRoutes()

约定式路由基于文件系统自动生成路由配置。

```typescript
// packages/core/src/route/routesConvention.ts

export function getConventionRoutes(opts: {
  base: string;      // pages 目录路径
  prefix?: string;
  exclude?: RegExp[];
}) {
  const files: { [routeId: string]: string } = {};
  
  if (!(existsSync(opts.base) && statSync(opts.base).isDirectory())) {
    return {};
  }
  
  // 1. 扫描所有文件
  visitFiles({
    dir: opts.base,
    visitor: (file) => {
      const routeId = createRouteId(file);
      if (isRouteModuleFile({ file: winPath(file), exclude: opts.exclude })) {
        files[routeId] = winPath(file);
      }
    },
  });

  // 2. 按路径长度排序（确保父路由在前）
  const routeIds = Object.keys(files).sort(byLongestFirst);
  
  // 3. 构建父子关系
  const parentToChildrenMap = new Map();
  routeIds.forEach((id) => {
    const prefix = `${id}/`;
    routeIds
      .filter((childId) => childId.startsWith(prefix) && childId !== id)
      .forEach((childId) => {
        if (!parentToChildrenMap.has(id)) {
          parentToChildrenMap.set(id, []);
        }
        parentToChildrenMap.get(id).push(childId);
      });
  });
  
  // 4. 定义嵌套路由
  function defineNestedRoutes(defineRoute: any, parentId?: string) {
    const childRouteIds = parentId
      ? parentToChildrenMap.get(parentId) || []
      : routeIds;
      
    for (let routeId of childRouteIds) {
      let routePath = createRoutePath(
        parentId ? routeId.slice(parentId.length + 1) : routeId,
      );
      
      defineRoute({
        path: routePath,
        file: `${opts.prefix || ''}${files[routeId]}`,
        children() {
          defineNestedRoutes(defineRoute, routeId);
        },
      });
    }
  }

  return defineRoutes(defineNestedRoutes);
}
```

### 文件扫描

```typescript
function visitFiles(opts: {
  dir: string;
  visitor: (file: string) => void;
  baseDir?: string;
}): void {
  opts.baseDir = opts.baseDir || opts.dir;
  
  for (let filename of readdirSync(opts.dir)) {
    let file = resolve(opts.dir, filename);
    let stat = lstatSync(file);
    
    if (stat.isDirectory()) {
      // 递归扫描子目录
      visitFiles({ ...opts, dir: file });
    } else if (
      stat.isFile() &&
      ['.tsx', '.ts', '.js', '.jsx', '.md', '.mdx', '.vue'].includes(
        extname(file),
      )
    ) {
      opts.visitor(relative(opts.baseDir, file));
    }
  }
}
```

### 路由 ID 创建

```typescript
// packages/core/src/route/utils.ts

export function createRouteId(file: string) {
  return stripFileExtension(normalizeParams(winPath(file)));
}

export function normalizeParams(file: string) {
  return file
    // /foo/[bar] -> /foo/:bar
    .replace(/\/\[/g, '/:')
    // /foo/[bar]/[baz] -> /foo/:bar/:baz
    .replace(/\]/g, '')
    // /foo/[[optional]] -> /foo/?:optional
    .replace(/\/\?\:/g, '/*');
}
```

### 路由路径生成

```typescript
function createRoutePath(routeId: string): string {
  let path = routeId
    // routes/$ -> routes/*
    .replace(/^\$$/, '*')
    // routes/docs.$ -> routes/docs/*
    .replace(/(\/|\.)\$$/, '/*')
    // routes/$user -> routes/:user
    .replace(/\$/g, ':')
    // routes/not.nested -> routes/not/nested
    .replace(/\./g, '/');

  // 处理 index 路由
  // /index/index -> '/index'
  path = /(^|\/)index\/index$/.test(path) 
    ? path.replace(/\/index$/, '') 
    : path;
  
  // 移除末尾的 index
  path = /\b\/?(?<!:)index$/.test(path) 
    ? path.replace(/\/?index$/, '') 
    : path;
  
  // 移除 README
  path = /\b\/?README$/.test(path) 
    ? path.replace(/\/?README$/, '') 
    : path;

  return path;
}
```

### 路由模块文件识别

```typescript
export function isRouteModuleFile(opts: {
  file: string;
  exclude?: RegExp[];
}): boolean {
  const { file, exclude = [] } = opts;
  
  // 排除文件
  for (const pattern of exclude) {
    if (pattern.test(file)) {
      return false;
    }
  }
  
  // 排除组件目录
  if (file.includes('/components/')) {
    return false;
  }
  
  // 排除某些特殊文件
  return (
    !file.endsWith('.d.ts') &&
    !file.endsWith('.test.ts') &&
    !file.endsWith('.test.tsx') &&
    !file.endsWith('.spec.ts') &&
    !file.endsWith('.spec.tsx')
  );
}
```

## 声明式路由

### getConfigRoutes()

将用户在配置中定义的路由转换为内部格式。

```typescript
// packages/core/src/route/routesConfig.ts

export function getConfigRoutes(opts: IOpts): any[] {
  const memo: IMemo = { ret: {}, id: 1 };
  
  transformRoutes({
    routes: opts.routes,
    parentId: undefined,
    memo,
    onResolveComponent: opts.onResolveComponent,
  });
  
  return memo.ret;
}

function transformRoutes(opts: {
  routes: any[];
  parentId: undefined | string;
  memo: IMemo;
  onResolveComponent?: Function;
}) {
  opts.routes.forEach((route) => {
    transformRoute({
      route,
      parentId: opts.parentId,
      memo: opts.memo,
      onResolveComponent: opts.onResolveComponent,
    });
  });
}

function transformRoute(opts: {
  route: any;
  parentId: undefined | string;
  memo: IMemo;
  onResolveComponent?: Function;
}) {
  assert(
    !opts.route.children,
    'children is not allowed in route props, use routes instead.',
  );
  
  const id = String(opts.memo.id++);
  const { routes, component, wrappers, ...routeProps } = opts.route;
  
  // 计算绝对路径
  let absPath = opts.route.path;
  if (absPath?.charAt(0) !== '/') {
    const parentAbsPath = opts.parentId
      ? opts.memo.ret[opts.parentId].absPath.replace(/\/+$/, '/')
      : '/';
    absPath = endsWithStar(parentAbsPath)
      ? parentAbsPath
      : ensureWithSlash(parentAbsPath, absPath);
  }
  
  opts.memo.ret[id] = {
    ...routeProps,
    path: opts.route.path,
    ...(component
      ? {
          file: opts.onResolveComponent
            ? opts.onResolveComponent(component)
            : component,
        }
      : {}),
    parentId: opts.parentId,
    id,
  };
  
  if (absPath) {
    opts.memo.ret[id].absPath = absPath;
  }
  
  // 处理包装器
  if (wrappers?.length) {
    let parentId = opts.parentId;
    let path = opts.route.path;
    let layout = opts.route.layout;
    
    wrappers.forEach((wrapper: any) => {
      const { id } = transformRoute({
        route: {
          path,
          component: wrapper,
          isWrapper: true,
          ...(layout === false ? { layout: false } : {}),
        },
        parentId,
        memo: opts.memo,
        onResolveComponent: opts.onResolveComponent,
      });
      parentId = id;
      path = endsWithStar(path) ? '*' : '';
    });
    
    opts.memo.ret[id].parentId = parentId;
    opts.memo.ret[id].path = path;
    opts.memo.ret[id].originPath = opts.route.path;
  }
  
  // 递归处理子路由
  if (opts.route.routes) {
    transformRoutes({
      routes: opts.route.routes,
      parentId: id,
      memo: opts.memo,
      onResolveComponent: opts.onResolveComponent,
    });
  }
  
  return { id };
}
```

### 路径拼接工具

```typescript
function endsWithStar(str: string) {
  return str.endsWith('*');
}

function ensureWithSlash(left: string, right: string) {
  if (!right?.length || right === '/') {
    return left;
  }
  return `${left.replace(/\/+$/, '')}/${right.replace(/^\/+/, '')}`;
}
```

## 路由定义工具

### defineRoutes()

```typescript
// packages/core/src/route/defineRoutes.ts

export function defineRoutes(
  defineRouteFn: (defineRoute: any, parentId?: string) => void,
) {
  const routes: any[] = [];
  
  function defineRoute(opts: {
    path?: string;
    component?: string;
    file?: string;
    children?: () => void;
  }) {
    const route: any = {
      path: opts.path,
      component: opts.component,
      file: opts.file,
    };
    
    routes.push(route);
    
    if (opts.children) {
      route.children = [];
      opts.children();
    }
  }
  
  defineRouteFn(defineRoute);
  
  return routes;
}
```

## 路由转换流程

```
用户配置/约定式文件
        ↓
  createRouteId()
        ↓
  生成路由 ID
        ↓
  createRoutePath()
        ↓
  生成路由路径
        ↓
  transformRoute()
        ↓
  添加父子关系
        ↓
  生成最终路由表
```

## 路由 ID 生成规则

### 动态参数

| 文件名 | 路由 ID | 路由路径 |
|--------|---------|----------|
| `[id].tsx` | `:id` | `/:id` |
| `$id.tsx` | `:id` | `/:id` |
| `[[optional]].tsx` | `?*optional` | `/*optional` |
| `[...rest].tsx` | `:*rest` | `/*rest` |

### Index 路由

| 文件名 | 路由 ID | 路由路径 |
|--------|---------|----------|
| `index.tsx` | `` (空) | `` (空) |
| `blog/index.tsx` | `blog` | `/blog` |
| `index/index.tsx` | `index` | `/index` |

### 嵌套路由

```
src/pages/
├── index.tsx          → /
├── users/
│   ├── index.tsx      → /users
│   ├── [id].tsx       → /users/:id
│   └── [id]/
│       └── edit.tsx   → /users/:id/edit
└── docs/
    └── $slug.tsx      → /docs/:slug
```

## 路由转换示例

### 声明式路由配置

```typescript
// .umirc.ts
export default {
  routes: [
    {
      path: '/',
      component: '@/layouts/index',
      routes: [
        { path: '', component: '@/pages/index' },
        { 
          path: 'users', 
          component: '@/layouts/users',
          routes: [
            { path: '', component: '@/pages/users/index' },
            { path: ':id', component: '@/pages/users/[id]' },
          ]
        },
      ],
    },
  ],
};
```

### 转换后的路由表

```typescript
{
  "1": {
    "path": "/",
    "file": "@/layouts/index",
    "parentId": undefined,
    "id": "1",
    "absPath": "/"
  },
  "2": {
    "path": "",
    "file": "@/pages/index",
    "parentId": "1",
    "id": "2",
    "absPath": "/"
  },
  "3": {
    "path": "users",
    "file": "@/layouts/users",
    "parentId": "1",
    "id": "3",
    "absPath": "/users"
  },
  "4": {
    "path": "",
    "file": "@/pages/users/index",
    "parentId": "3",
    "id": "4",
    "absPath": "/users"
  },
  "5": {
    "path": ":id",
    "file": "@/pages/users/[id]",
    "parentId": "3",
    "id": "5",
    "absPath": "/users/:id"
  }
}
```

## Wrappers 处理

wrappers 允许为路由添加包装组件（如权限控制）：

```typescript
{
  path: '/admin',
  component: '@/pages/admin',
  wrappers: [
    '@/wrappers/auth',
    '@/wrappers/analytics',
  ],
}
```

转换后的路由结构：

```
admin 路由
  └── auth wrapper
      └── analytics wrapper
          └── admin 组件
```

## 路由工具函数

### 路径标准化工具

```typescript
// packages/core/src/route/utils.ts

export function winPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function stripFileExtension(file: string): string {
  return file.replace(/\.[a-z]+$/i, '');
}

export function byLongestFirst(a: string, b: string): number {
  return b.length - a.length;
}
```

## 总结

Umi 的路由生成系统提供了两种灵活的方式：

1. **约定式路由** - 基于文件系统自动生成，约定优于配置
2. **声明式路由** - 显式配置，适合复杂场景

核心特点：

- 支持动态参数（`[id]`, `$id`）
- 支持可选参数（`[[optional]]`）
- 支持嵌套路由
- 支持路由包装器（wrappers）
- 自动处理 index 路由
- 支持 TypeScript/JavaScript/Vue 文件

---

📖 **上一篇**: [配置加载](/core/config-loading)  
📖 **下一篇**: [MFSU 实现](/core/mfsu)