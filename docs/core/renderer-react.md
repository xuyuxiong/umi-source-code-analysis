# React 渲染器

## 概述

`@umijs/renderer-react` 是 UmiJS 的 React 渲染层，负责将路由配置转换为可渲染的 React 组件树，并提供浏览器端和服务端渲染能力。本文档深入分析其核心架构和实现。

## 架构设计

### 模块结构

```
packages/renderer-react/src/
├── browser.tsx        # 浏览器端渲染
├── server.tsx         # 服务端渲染
├── routes.tsx         # 路由渲染组件
├── html.tsx           # HTML 文档模板
├── appContext.ts      # 应用上下文
├── routeContext.ts    # 路由上下文
├── link.tsx           # Link 组件
├── withRouter.tsx     # withRouter HOC
├── dataFetcher.ts     # 数据获取器
├── useFetcher.ts      # useFetcher Hook
└── types.ts          # 类型定义
```

## 浏览器端渲染

### 主入口

```typescript
// packages/renderer-react/src/index.ts

export { render } from './browser';
export { renderServer } from './server';
export { context as default } from './appContext';
export { Link, NavLink } from './link';
export { withRouter } from './withRouter';
export type { IRoute } from './types';
```

### render() 函数

```typescript
// packages/renderer-react/src/browser.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'umi/router';
import { AppProvider } from './appContext';
import { Routes } from './routes';
import type { IRouteProps } from './types';

interface IRenderOpts {
  clientRootElement: HTMLElement | null;
  routes: IRouteProps[];
  history: any;
  appElId?: string;
  onRender?: (args: {
    clientRootElement: HTMLElement;
    reactElement: React.ReactNode;
  }) => void;
}

export async function render(opts: IRenderOpts) {
  const {
    clientRootElement = document.getElementById(opts.appElId || 'root'),
    routes,
    history,
  } = opts;

  // 1. 创建 React 应用
  const reactElement = (
    <AppProvider {...opts}>
      <RouterProvider history={history}>
        <Routes routes={routes} />
      </RouterProvider>
    </AppProvider>
  );

  // 2. 渲染到 DOM
  if (clientRootElement) {
    // 3  hydrate
    const root = createRoot(clientRootElement);
    root.render(reactElement);

    // 3. 自定义渲染回调
    opts.onRender?.({
      clientRootElement,
      reactElement,
    });
  }
}
```

### AppProvider 上下文

```typescript
// packages/renderer-react/src/appContext.ts

import React, { createContext, useContext } from 'react';

interface IAppContext {
  history?: any;
  Routes?: React.ComponentType<any>;
  [key: string]: any;
}

export const context = createContext<IAppContext>({});

export function AppProvider({
  children,
  ...props
}: {
  children: React.ReactNode;
}) {
  return (
    <context.Provider value={props}>
      {children}
    </context.Provider>
  );
}

export function useAppData() {
  return useContext(context);
}
```

## 路由渲染系统

### Routes 组件

```typescript
// packages/renderer-react/src/routes.tsx

import React, { useMemo } from 'react';
import { RouteObject, useRoutes } from 'react-router-dom';
import type { IRouteProps } from './types';
import { prepareRoutes } from './utils';

interface IRoutesProps {
  routes: IRouteProps[];
  componentSuffix?: string;
  FlatComponent?: React.ComponentType;
}

export function Routes(props: IRoutesProps) {
  const { routes, componentSuffix = '', FlatComponent } = props;

  // 1. 准备路由配置
  const preparedRoutes = useMemo(() => {
    return prepareRoutes(routes, {
      componentSuffix,
      FlatComponent,
    });
  }, [routes, componentSuffix, FlatComponent]);

  // 2. 使用 react-router 的 useRoutes
  const element = useRoutes(preparedRoutes as RouteObject[]);

  return element;
}
```

### prepareRoutes() 函数

```typescript
// packages/renderer-react/src/routes.tsx

interface IPrepareRoutesOpts {
  componentSuffix?: string;
  FlatComponent?: React.ComponentType;
  RoutesComponent?: React.ComponentType;
}

export function prepareRoutes(
  routes: IRouteProps[],
  opts: IPrepareRoutesOpts = {},
): IRouteProps[] {
  const { componentSuffix = '', FlatComponent, RoutesComponent } = opts;

  return routes.map((route) => {
    const newRoute: IRouteProps = { ...route };

    // 1. 处理组件
    if (newRoute.component) {
      // 动态导入
      if (typeof newRoute.component === 'string') {
        newRoute.element = React.createElement(
          React.lazy(() => import(/* webpackChunkName: "[request]" */ `${newRoute.component}${componentSuffix}`))
        );
      } else {
        // 直接使用组件
        newRoute.element = React.createElement(newRoute.component as React.ComponentType);
      }
    }

    // 2. 处理子路由
    if (newRoute.routes) {
      newRoute.children = prepareRoutes(newRoute.routes, opts);
    }

    // 3. 处理包装器
    if (newRoute.wrappers) {
      newRoute.element = wrapElement(newRoute.element, newRoute.wrappers);
    }

    // 4. 处理路由布局
    if (newRoute.layout === false) {
      newRoute.element = React.createElement(
        React.Fragment,
        null,
        newRoute.element
      );
    }

    return newRoute;
  });
}
```

### wrapElement() 函数

```typescript
function wrapElement(
  element: React.ReactNode,
  wrappers: string[] | Array<React.ComponentType>,
): React.ReactNode {
  if (!wrappers?.length) return element;

  let wrapped = element;

  // 从外向内包裹
  wrappers.reverse().forEach((wrapper) => {
    wrapped = React.createElement(
      wrapper as React.ComponentType,
      null,
      wrapped
    );
  });

  return wrapped;
}
```

## 服务端渲染

### renderServer() 函数

```typescript
// packages/renderer-react/src/server.tsx

import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import type { IRouteProps } from './types';

interface IServerRenderOpts {
  routes: IRouteProps[];
  path: string;
  basename?: string;
  [key: string]: any;
}

export async function renderServer(opts: IServerRenderOpts) {
  const { routes, path, basename = '/' } = opts;

  // 1. 准备路由
  const preparedRoutes = prepareRoutes(routes);

  // 2. 创建静态路由上下文
  const reactElement = (
    <StaticRouter location={path} basename={basename}>
      <Routes routes={preparedRoutes} />
    </StaticRouter>
  );

  // 3. 渲染为 HTML 字符串
  const html = renderToString(reactElement);

  return {
    html,
  };
}
```

### HTML 模板

```typescript
// packages/renderer-react/src/html.tsx

import React from 'react';

interface IHTMLProps {
  title?: string;
  headScripts?: string[];
  styles?: string[];
  scripts?: string[];
  mountElementId?: string;
  children?: React.ReactNode;
  metas?: string[];
  links?: string[];
}

export function HTML(props: IHTMLProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* 标题 */}
        {props.title && <title>{props.title}</title>}
        
        {/* Meta 标签 */}
        {props.metas?.map((meta, i) => (
          <meta key={i} {...parseAttrs(meta)} />
        ))}
        
        {/* Link 标签 */}
        {props.links?.map((link, i) => (
          <link key={i} {...parseAttrs(link)} />
        ))}
        
        {/* 样式表 */}
        {props.styles?.map((style, i) => (
          <link key={i} rel="stylesheet" href={style} />
        ))}
        
        {/* 头部脚本 */}
        {props.headScripts?.map((script, i) => (
          <script key={i} {...parseScriptAttrs(script)} />
        ))}
        
        {/* 服务端渲染内容 */}
        {props.children}
      </head>
      
      <body>
        {/* 挂载点 */}
        <div id={props.mountElementId || 'root'} />
        
        {/* 底部脚本 */}
        {props.scripts?.map((script, i) => (
          <script key={i} {...parseScriptAttrs(script)} />
        ))}
      </body>
    </html>
  );
}
```

## 路由组件

### Link 组件

```typescript
// packages/renderer-react/src/link.tsx

import React from 'react';
import { Link as RouterLink, NavLink as RouterNavLink } from 'react-router-dom';

interface LinkProps {
  to: string;
  replace?: boolean;
  state?: any;
  [key: string]: any;
}

export function Link(props: LinkProps) {
  return <RouterLink {...props} />;
}

export function NavLink(props: LinkProps & {
  activeClassName?: string;
  exact?: boolean;
}) {
  return <RouterNavLink {...props} />;
}
```

### withRouter HOC

```typescript
// packages/renderer-react/src/withRouter.tsx

import React from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';

export function withRouter<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithRouter(props: P) {
    const history = useHistory();
    const location = useLocation();
    const params = useParams();

    const router = {
      history,
      location,
      params,
      route: {
        path: location.pathname,
      },
      routes: [],  // 从 context 获取
      match: {
        params,
      },
    };

    return <Component {...props} router={router} />;
  };
}
```

## 数据获取

### Data Fetcher

```typescript
// packages/renderer-react/src/dataFetcher.ts

import { fetcher } from 'swr';

interface IDataFetcherConfig {
  fetchers?: any[];
}

export function createDataFetcher(opts: IDataFetcherConfig = {}) {
  const { fetchers = [] } = opts;

  return {
    // 获取数据
    async fetch(key: string, ...args: any[]) {
      for (const fetcher of fetchers) {
        try {
          const data = await fetcher(key, ...args);
          if (data !== undefined) {
            return data;
          }
        } catch (e) {
          // 继续下一个 fetcher
        }
      }
      throw new Error(`No fetcher found for key: ${key}`);
    },
  };
}
```

### useFetcher Hook

```typescript
// packages/renderer-react/src/useFetcher.ts

import { useFetchers } from 'react-router-dom';

export function useFetcher() {
  const fetchers = useFetchers();

  return {
    // 获取数据
    load: async (url: string) => {
      const response = await fetch(url);
      return response.json();
    },

    // 提交数据
    submit: async (url: string, data: any, opts?: any) => {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        ...opts,
      });
      return response.json();
    },
  };
}
```

## 上下文系统

### Route Context

```typescript
// packages/renderer-react/src/routeContext.ts

import React, { createContext, useContext } from 'react';

interface IRouteContext {
  route: any;
  routes: any[];
  params: Record<string, any>;
  location: Location;
}

export const RouteContext = createContext<IRouteContext>({} as IRouteContext);

export function useRouteContext() {
  return useContext(RouteContext);
}
```

### Provider 嵌套结构

```
<AppProvider>
  <RouterProvider history={history}>
    <RouteContext.Provider value={routeContext}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="users" element={<Users />}>
            <Route path=":id" element={<UserDetail />} />
          </Route>
        </Route>
      </Routes>
    </RouteContext.Provider>
  </RouterProvider>
</AppProvider>
```

## 路由配置转换

### 扁平化路由

```typescript
// packages/renderer-react/src/utils.ts

export function flattenRoutes(
  routes: IRouteProps[],
  parentPath = '',
): IRouteProps[] {
  return routes.reduce((acc: IRouteProps[], route) => {
    const path = joinPath(parentPath, route.path);
    const flattened = { ...route, path };

    // 移除 routes 属性
    if (route.routes) {
      const { routes: children, ...rest } = flattened;
      acc.push(rest);
      acc.push(...flattenRoutes(route.routes, path));
    } else {
      acc.push(flattened);
    }

    return acc;
  }, []);
}

function joinPath(parent: string, child: string): string {
  if (!child) return parent;
  return parent ? `${parent.replace(/\/$/, '')}/${child.replace(/^\//, '')}` : child;
}
```

### 路由懒加载

```typescript
// 生成懒加载组件
function createLazyComponent(importPath: string) {
  return React.lazy(() => import(importPath));
}

// 使用示例
const routes = [
  {
    path: '/users',
    element: createLazyComponent('@/pages/Users'),
  },
  {
    path: '/about',
    element: createLazyComponent('@/pages/About'),
  },
];
```

## 类型定义

```typescript
// packages/renderer-react/src/types.ts

import type { ReactNode, ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';

export interface IRouteProps extends Omit<RouteObject, 'children'> {
  // Umi 扩展属性
  routes?: IRouteProps[];
  wrappers?: string[] | ComponentType[];
  layout?: boolean;
  exact?: boolean;
  
  // 组件
  component?: string | ComponentType;
  element?: ReactNode;
  
  // 其他
  [key: string]: any;
}

export interface IRenderConfig {
  history: History;
  routes: IRouteProps[];
  basename?: string;
}
```

## 最佳实践

### 1. 代码分割

```typescript
// 按路由分割
const routes = {
  '/': { component: '@/pages/Home' },
  '/users': { component: '@/pages/Users' },
  '/settings': { component: () => import('@/pages/Settings') },
};
```

### 2. 路由包装器

```typescript
// 权限控制
export default {
  routes: [
    {
      path: '/admin',
      component: '@/pages/Admin',
      wrappers: [
        '@/wrappers/auth',
        '@/wrappers/analytics',
      ],
    },
  ],
};
```

### 3. 服务端渲染

```typescript
// server.tsx
import { renderServer } from '@umijs/renderer-react/server';

app.get('*', async (req, res) => {
  const { html } = await renderServer({
    routes,
    path: req.url,
  });
  res.send(html);
});
```

## 性能优化

### 1. 预加载组件

```typescript
// 预加载更多组
import { preload } from 'react-dom';

// 用户点击前预加载
<a onMouseEnter={() => preload('@/pages/About')}>关于</a>
```

### 2. 减少不必要的重渲染

```typescript
// 使用 React.memo
const MemoizedComponent = React.memo(function Component(props) {
  return <div>{props.value}</div>;
});
```

### 3. 路由级代码分割

```typescript
// 使用懒加载
const LazyRoute = React.lazy(() => import('./LazyRoute'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyRoute />
    </Suspense>
  );
}
```

## 调试技巧

### 路由调试

```typescript
// 打印路由配置
console.log(JSON.stringify(routes, null, 2));

// 使用 React DevTools 查看组件树
```

### SSR 调试

```typescript
// 输出服务端渲染日志
DEBUG=umi:server umi dev
```

## 总结

`@umijs/renderer-react` 提供了：

1. **双端渲染** - 浏览器端和服务端渲染支持
2. **路由系统集成** - 基于 react-router-dom
3. **上下文管理** - AppContext、RouteContext
4. **组件懒加载** - 按需加载和代码分割
5. **类型安全** - TypeScript 类型定义

---

📖 **上一篇**: [ESBuild 打包](/core/bundler-esbuild)  
📖 **下一篇**: [插件开发](/core/plugin-development)