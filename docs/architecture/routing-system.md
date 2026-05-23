# 路由系统

## 概述

Umi 的路由系统支持两种路由模式：

1. **约定式路由** - 基于文件系统的路由自动生
2. **配置式路由** - 通过配置文件显式定义路由

两种模式可以混合使用，但推荐优先使用约定式路由。

## 约定式路由

### 基本规则

约定式路由基于 `src/pages` 目录的文件结构自动生成路由：

```
src/pages/
├── index.tsx              # /
├── about.tsx              # /about
├── user/
│   ├── index.tsx          # /user
│   ├── profile.tsx        # /user/profile
│   └── [id].tsx           # /user/:id (动态路由)
├── settings/
│   ├── _layout.tsx        # /settings 的布局组件
│   ├── profile.tsx        # /settings/profile
│   └── security.tsx       # /settings/security
└── blog/
    ├── [category]/
    │   └── [slug].tsx     # /blog/:category/:slug
    └── index.tsx          # /blog
```

### 源码实现

约定式路由在 `@umijs/core` 的 `RoutesConvention` 类中实现：

```typescript
// packages/core/src/route/routesConvention.ts

export class RoutesConvention {
  private absPagesPath: string;
  private excludeFiles: string[];
  
  constructor(opts: {
    absPagesPath: string;
    excludeFiles?: string[];
  }) {
    this.absPagesPath = opts.absPagesPath;
    this.excludeFiles = opts.excludeFiles || [];
  }

  getRoutes() {
    // 1. 扫描 pages 目录
    const files = this.getConventionRoutesFiles();
    
    // 2. 生成路由配置
    const routes = this.generateRoutes(files);
    
    // 3. 处理布局
    this.handleLayouts(routes);
    
    return routes;
  }

  private getConventionRoutesFiles() {
    // 使用 globby 扫描文件
    return globby.sync(
      [
        '**/*.{ts,tsx,js,jsx}',
        '!**/*.d.ts',
        '!**/_*',  // 排除 _ 开头的文件
      ],
      {
        cwd: this.absPagesPath,
        absolute: true,
      }
    );
  }

  private generateRoutes(files: string[]) {
    const routes: Record<string, IRoute> = {};
    
    for (const file of files) {
      // 计算相对路径
      const relativePath = relative(this.absPagesPath, file);
      
      // 生成路由 ID
      const id = this.getFileId(relativePath);
      
      // 生成路由路径
      const path = this.normalizePath(relativePath);
      
      // 创建路由对象
      routes[id] = {
        id,
        path,
        file: relativePath,
        absPath: file,
        parentId: this.getParentId(id),
      };
    }
    
    return routes;
  }
}
```

### 特殊文件/目录命名

| 命名模式 | 说明 | 示例 |
|---------|------|------|
| `index.tsx` | 页面入口 | `/user/index.tsx` → `/user` |
| `[param].tsx` | 动态路由 | `/user/[id].tsx` → `/user/:id` |
| `[...param].tsx` | 动态匹配所有 | `/[...slug].tsx` → `/*` |
| `_layout.tsx` | 布局组件 | `/settings/_layout.tsx` |
| `_.tsx` | 仅用于布局的占位符 | `/_.tsx` |

### 动态路由参数

```typescript
// src/pages/user/[id].tsx
import { useParams } from 'umi';

export default function UserPage() {
  const params = useParams();
  console.log(params.id); // 访问 /user/123 → "123"
  return <div>User {params.id}</div>;
}

// src/pages/blog/[category]/[slug].tsx
import { useParams } from 'umi';

export default function BlogPost() {
  const params = useParams();
  console.log(params.category); // 分类
  console.log(params.slug);     // 文章 slug
  return <div>{params.category}/{params.slug}</div>;
}
```

## 配置式路由

### 基础配置

```typescript
// .umirc.ts
export default {
  routes: [
    {
      path: '/',
      component: 'index',
    },
    {
      path: '/about',
      component: 'about',
    },
    {
      path: '/user',
      routes: [
        { path: '/user', redirect: '/user/profile' },
        { path: '/user/profile', component: 'user/profile' },
        { path: '/user/:id', component: 'user/[id]' },
      ],
    },
  ],
};
```

### 完整配置示例

```typescript
// .umirc.ts
export default {
  routes: [
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        {
          path: '/',
          redirect: '/home',
        },
        {
          path: '/home',
          component: '@/pages/home',
          // 路由元数据
          title: '首页',
          icon: 'home',
        },
        {
          path: '/user',
          component: '@/layouts/UserLayout',
          routes: [
            {
              path: '/user',
              redirect: '/user/login',
            },
            {
              path: '/user/login',
              component: '@/pages/user/login',
              title: '登录',
            },
            {
              path: '/user/register',
              component: '@/pages/user/register',
              title: '注册',
            },
          ],
        },
        {
          path: '/dashboard',
          component: '@/pages/dashboard',
          title: '仪表盘',
          // 权限控制
          access: 'canViewDashboard',
          // 路由守卫
          wrappers: ['@/wrappers/auth'],
        },
        {
          path: '*',
          component: '@/pages/404',
        },
      ],
    },
  ],
};
```

### 配置式路由的类型定义

```typescript
// packages/preset-umi/src/types.ts

export interface IRoute {
  // 路由路径
  path?: string;
  
  // 组件路径 (相对于 pages 目录)
  component?: string;
  
  // 子路由
  routes?: IRoute[];
  
  // 重定向
  redirect?: string;
  
  // 路由 ID (内部使用)
  id?: string;
  
  // 父路由 ID (内部使用)
  parentId?: string;
  
  // 绝对路径 (内部使用)
  absPath?: string;
  
  // 文件路径 (内部使用)
  file?: string;
  
  // 是否是布局
  isLayout?: boolean;
  
  // 包装器
  wrappers?: string[];
  
  // 元数据
  [key: string]: any;
}
```

## 路由生成流程

### 临时文件生成

路由配置最终生成 `src/.umi/core/route.tsx`：

```typescript
// src/.umi/core/route.tsx (生成后)
import React from 'react';
import clientLoaders from './loaders.js';

export const routes = {
  "p_index": {
    "path": "/",
    "component": await import('../../pages/index.tsx'),
  },
  "p_about": {
    "path": "/about",
    "component": await import('../../pages/about.tsx'),
  },
  "p_user_index": {
    "path": "/user",
    "component": await import('../../pages/user/index.tsx'),
  },
  "p_user__id_": {
    "path": "/user/:id",
    "component": await import('../../pages/user/[id].tsx'),
  },
};

// 路由组件映射
const routeComponents = {
  "p_index": lazy(() => import('../../pages/index.tsx')),
  "p_about": lazy(() => import('../../pages/about.tsx')),
  // ...
};
```

### 生成源码

```typescript
// packages/preset-umi/src/features/tmpFiles/routes.ts

export async function getRoutes(opts: { api: IApi }) {
  const { api } = opts;
  
  // 1. 优先使用配置式路由
  if (api.userConfig.routes) {
    return api.userConfig.routes;
  }
  
  // 2. 使用约定式路由
  const routesConvention = new RoutesConvention({
    absPagesPath: api.paths.absPagesPath,
    excludeFiles: api.config.conventionRoutes?.exclude,
  });
  
  const routes = routesConvention.getRoutes();
  return routes;
}
```

## 路由组件

### Route 组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Route 组件树                               │
└─────────────────────────────────────────────────────────────────┘

  routes: {
    "p_layout": {
      path: "/",
      component: "@/layouts/BasicLayout",
      children: ["p_home", "p_about"]
    },
    "p_home": {
      path: "/home",
      component: "@/pages/home",
      parentId: "p_layout"
    },
    "p_about": {
      path: "/about",
      component: "@/pages/about",
      parentId: "p_layout"
    }
  }

  渲染结构:
  <BasicLayout>
    <Outlet />
    └── <Home /> 或 <About />
  </BasicLayout>
```

### Outlet 组件

用于在父路由中渲染子路由：

```tsx
// src/layouts/BasicLayout.tsx
import { Outlet } from 'umi';

export default function BasicLayout() {
  return (
    <div className="layout">
      <header>Header</header>
      <main>
        <Outlet />  {/* 子路由渲染在这里 */}
      </main>
      <footer>Footer</footer>
    </div>
  );
}
```

## 路由跳转

### 使用 history

```tsx
import { useHistory } from 'umi';

export default function Page() {
  const history = useHistory();
  
  const handleClick = () => {
    // 跳转到指定路径
    history.push('/about');
    
    // 带参数跳转
    history.push('/user/123');
    
    // 带 query 参数
    history.push('/search?q=umi');
    
    // 替换当前历史记录
    history.replace('/home');
    
    // 前进/后退
    history.go(-1);  // 后退
    history.go(1);   // 前进
  };
  
  return <button onClick={handleClick}>Go About</button>;
}
```

### 使用 Link

```tsx
import { Link, NavLink } from 'umi';

export default function Nav() {
  return (
    <nav>
      {/* 基本链接 */}
      <Link to="/about">关于</Link>
      
      {/* 带参数的链接 */}
      <Link to="/user/123">用户</Link>
      
      {/* 带 query 的链接 */}
      <Link to="/search?q=umi">搜索</Link>
      
      {/* 活动链接 (匹配时有 active 类) */}
      <NavLink to="/home">首页</NavLink>
      
      {/* 精确匹配 */}
      <NavLink to="/home" end>首页</NavLink>
    </nav>
  );
}
```

## 路由守卫

### 使用 wrappers

```typescript
// .umirc.ts
export default {
  routes: [
    {
      path: '/admin',
      component: 'admin',
      wrappers: [
        '@/wrappers/auth',      // 认证守卫
        '@/wrappers/permission', // 权限守卫
      ],
    },
  ],
};
```

```tsx
// src/wrappers/auth.tsx
import { Navigate, useLocation } from 'umi';

export default (props: any) => {
  const isLogin = localStorage.getItem('token');
  const location = useLocation();
  
  if (isLogin) {
    return props.children;
  } else {
    // 重定向到登录页，保存当前路径
    return <Navigate to="/user/login" state={{ from: location }} />;
  }
};
```

### 使用 patchRoutes

```tsx
// src/app.ts
export function patchRoutes({ routes }) {
  // 动态添加路由
  routes.unshift({
    path: '/custom',
    component: '@/pages/custom',
  });
  
  // 动态修改路由
  const adminRoute = routes.find(r => r.path === '/admin');
  if (adminRoute) {
    adminRoute.wrappers = ['@/wrappers/auth'];
  }
}
```

## 代码分割

### 自动按需加载

Umi 默认对路由组件进行代码分割：

```typescript
// src/.umi/core/route.tsx (生成后)
const routeComponents = {
  "p_home": lazy(() => import('../../pages/home.tsx')),
  "p_about": lazy(() => import('../../pages/about.tsx')),
  "p_user": lazy(() => import('../../pages/user/index.tsx')),
};
```

### 预加载

```tsx
import { usePrefetch } from 'umi';

export default function Page() {
  const prefetch = usePrefetch();
  
  return (
    <div>
      {/* 鼠标悬停时预加载 */}
      <Link 
        to="/about" 
        onMouseEnter={() => prefetch('/about')}
      >
        关于
      </Link>
    </div>
  );
}
```

## 路由类型

### useParams

```tsx
import { useParams } from 'umi';

interface Params {
  id: string;
  category?: string;
}

export default function Page() {
  const params = useParams<Params>();
  console.log(params.id);
  return <div>ID: {params.id}</div>;
}
```

### useLocation

```tsx
import { useLocation } from 'umi';

export default function Page() {
  const location = useLocation();
  
  console.log(location.pathname);  // 路径
  console.log(location.search);    // query 参数
  console.log(location.hash);      // hash
  console.log(location.state);     // 状态
  
  return <div>{location.pathname}</div>;
}
```

### useHistory

```tsx
import { useHistory } from 'umi';

export default function Page() {
  const history = useHistory();
  
  // 跳转
  history.push('/path');
  
  // 替换
  history.replace('/path');
  
  // 返回
  history.back();
  
  // 前进
  history.forward();
  
  // go
  history.go(-1);
  
  return <div>Page</div>;
}
```

### useMatch

```tsx
import { useMatch } from 'umi';

export default function Page() {
  const matchHome = useMatch('/home');
  const matchUser = useMatch('/user/:id');
  
  if (matchHome) {
    console.log('在首页');
  }
  
  if (matchUser) {
    console.log('用户 ID:', matchUser.params.id);
  }
  
  return <div>Page</div>;
}
```

## 路由配置选项

### conventionRoutes 配置

```typescript
// .umirc.ts
export default {
  conventionRoutes: {
    // 自定义 pages 目录
    base: './src/views',
    
    // 排除的文件
    exclude: [
      /components\//,  // 排除 components 目录
      /\.test\./,      // 排除测试文件
    ],
    
    // 是否包括不使用文件扩展名的文件
    include: [
      /\.tsx?$/,
      /\.jsx?$/,
    ],
  },
};
```

### exportStatic 配置

```typescript
// .umirc.ts
export default {
  exportStatic: {
    // 是否输出 .html
    htmlSuffix: true,
    
    // 动态路由配置
    dynamicRoot: '/dist/',
  },
};
```

## 路由调试

### 查看生成的路由

```bash
# 启动开发服务器后访问
http://localhost:8000/__umi/routes

# 或者在终端查看 DEBUG 输出
DEBUG=umi:routes pnpm dev
```

### 路由日志

```typescript
// 在 app.ts 中
export function patchClientRoutes({ routes }) {
  console.log('当前路由配置:', JSON.stringify(routes, null, 2));
}
```

## 总结

Umi 的路由系统提供了：

1. **灵活的路由模式** - 约定式和配置式共存
2. **强大的动态路由** - 支持动态参数和匹配所有
3. **内置代码分割** - 按需加载优化性能
4. **路由守卫** - wrappers 和 patchRoutes 实现权限控制
5. **完整的类型支持** - 完整的 TypeScript 类型定义

理解路由系统对于开发 Umi 应用至关重要。

---

📖 **上一篇**: [配置系统](/architecture/config-system)
📖 **下一篇**: [Preset 机制](/architecture/preset-mechanism)