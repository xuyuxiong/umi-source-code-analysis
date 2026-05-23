# AST 转换

## 概述

UmiJS 在编译过程中大量使用 AST（抽象语法树）转换技术，实现了插件系统、按需加载、环境变量替换等功能。本文档深入分析 Umi 的 AST 转换机制和 Babel 配置。

## Babel 配置

### 预设配置

```typescript
// packages/babel-preset-umi/src/index.ts

interface IOpts {
  presetEnv?: object;
  presetReact?: object;
  presetTypeScript?: object;
  pluginTransformRuntime?: object;
  pluginLockCoreJSVersion?: string;
}

export default function (
  api: any,
  opts: IOpts = {}
) {
  return {
    presets: [
      // 1. TypeScript
      opts.presetTypeScript && [
        require.resolve('@babel/preset-typescript'),
        opts.presetTypeScript,
      ],
      
      // 2. React
      opts.presetReact && [
        require.resolve('@babel/preset-react'),
        opts.presetReact,
      ],
      
      // 3. Env
      opts.presetEnv && [
        require.resolve('@babel/preset-env'),
        opts.presetEnv,
      ],
    ],
    
    plugins: [
      // 4. Decorator
      [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
      
      // 5. Class Properties
      require.resolve('@babel/plugin-proposal-class-properties'),
      
      // 6. Optional Chaining
      require.resolve('@babel/plugin-proposal-optional-chaining'),
      
      // 7. Nullish Coalescing
      require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
      
      // 8. Transform Runtime
      opts.pluginTransformRuntime && [
        require.resolve('@babel/plugin-transform-runtime'),
        opts.pluginTransformRuntime,
      ],
    ].filter(Boolean),
  };
}
```

## 自定义 Babel 插件

### 插件结构

```typescript
// 插件模板
export default function myPlugin() {
  return {
    name: 'my-plugin',
    
    visitor: {
      // 访问器
      Program(path, state) {
        // 遍历 AST
      },
      
      ImportDeclaration(path) {
        // 处理 import
      },
    },
  };
}
```

### 按需加载插件

```typescript
// packages/babel-plugin-import-to-await-require/src/index.ts

export default function ({ types: t }) {
  return {
    name: 'import-to-await-require',
    
    visitor: {
      ImportDeclaration(path, state) {
        const { source } = path.node;
        
        // 判断是否为依赖
        if (isDep(source.value)) {
          // 转换为 await import()
          const awaitImport = t.callExpression(
            t.awaitExpression(
              t.callExpression(t.import(), [source])
            ),
            []
          );
          
          // 替换节点
          path.replaceWith(t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('module'),
              awaitImport
            )
          ]));
        }
      },
    },
  };
}
```

## AST 转换流程

```
源代码
    ↓
Parse (解析)
    ↓  Esprima / Babel Parser
AST (抽象语法树)
    ↓
Transform (转换)
    ↓  Babel / SWC
新 AST
    ↓
Generate (生成)
    ↓  Babel Generator
新代码
    ↓
SourceMap
```

## 常见转换场景

### 1. 环境变量替换

```typescript
// Babel 插件
export default function () {
  return {
    visitor: {
      MemberExpression(path) {
        const { node } = path;
        
        // process.env.NODE_ENV
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'process' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'env'
        ) {
          // 替换为实际值
          path.replaceWith(
            t.stringLiteral(process.env.NODE_ENV)
          );
        }
      },
    },
  };
}
```

### 2. Container 转换

```typescript
// packages/babel-plugin-react-to-ssr/src/index.ts

export default function ({ types: t }) {
  return {
    visitor: {
      JSXElement(path, state) {
        const { openingElement } = path.node;
        
        // 判断是否为特定组件
        if (isContainerComponent(openingElement.name)) {
          // 添加 SSR 属性
          openingElement.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-ssr'),
              t.stringLiteral('true')
            )
          );
        }
      },
    },
  };
}
```

### 3. 路由转换

```typescript
// packages/babel-plugin-optimize-import/src/index.ts

export default function ({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        
        // 处理 @umijs/max 导出
        if (source.startsWith('@umijs/max')) {
          const specifiers = path.node.specifiers;
          
          specifiers.forEach(specifier => {
            if (t.isImportSpecifier(specifier)) {
              const importedName = specifier.imported.name;
              
              // 按需导入
              path.insertAfter(
                t.importDeclaration(
                  [t.importDefaultSpecifier(specifier.local)],
                  t.stringLiteral(`@umijs/max/${importedName}`)
                )
              );
            }
          });
          
          path.remove();
        }
      },
    },
  };
}
```

## AST 工具函数

### 判断表达式类型

```typescript
function isReactComponent(path) {
  const { node } = path;
  
  return (
    node.type === 'JSXElement' ||
    node.type === 'JSXFragment'
  );
}

function isFunctionComponent(path) {
  return (
    path.isFunctionDeclaration() ||
    path.isArrowFunctionExpression() ||
    path.isFunctionExpression()
  );
}
```

### 生成唯一 ID

```typescript
function generateUid(path, hint = 'temp') {
  let uid = hint;
  let i = 0;
  
  while (path.scope.hasBinding(uid)) {
    uid = `${hint}_${i++}`;
  }
  
  return uid;
}
```

### 作用域提升

```typescript
function hoistToTop(path, node) {
  const program = path.findParent(p => p.isProgram());
  program.unshiftContainer('body', node);
}
```

## SWC 集成

### SWC 配置

```typescript
// .swcrc

{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "decorators": true
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    },
    "target": "es2015"
  }
}
```

### SWC 插件

```typescript
// packages/swc-plugin-import/src/lib.rs

use swc_core::{
  plugin::{plugin_transform, proxies::TransformPluginProgramMetadata },
  visitor::Fold,
};

#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
  // AST 转换逻辑
  program.fold_with(&mut ImportVisitor::new())
}
```

## 性能优化

### 1. 缓存转换结果

```typescript
import { createHash } from 'crypto';

const cache = new Map();

function transform(code, filename) {
  const hash = createHash('md5')
    .update(code)
    .update(filename)
    .digest('hex');
  
  if (cache.has(hash)) {
    return cache.get(hash);
  }
  
  const result = babel.transform(code, { filename });
  cache.set(hash, result);
  return result;
}
```

### 2. 仅转换必要文件

```typescript
export default function (api, opts) {
  return {
    visitor: {
      Program(path, state) {
        // 跳过 node_modules
        if (/node_modules/.test(state.filename)) {
          return;
        }
        
        // 继续转换
      },
    },
  };
}
```

### 3. 并行编译

```typescript
import { worker } from 'worker_threads';

async function parallelTransform(files) {
  const results = await Promise.all(
    files.map(file => transformFile(file))
  );
  return results;
}
```

## 调试技巧

### AST 可视化

```bash
# 使用 AST Explorer
https://astexplorer.net/

# 或使用 Babel Standalone
const { transformSync } = require('@babel/core');
const result = transformSync('const a = 1');
console.log(JSON.stringify(result.ast, null, 2));
```

### 插件调试

```bash
# 启用 Babel 调试日志
BABEL_SHOW_CONFIG_FOR=./src/index.ts umi dev
```

## 总结

AST 转换是 UmiJS 编译系统的核心：

1. **Babel 插件** - 按需加载、环境变量替换
2. **SWC 集成** - 更快的编译速度
3. **类型支持** - TypeScript/Flow
4. **转换优化** - 缓存和并行处理

---

📖 **上一篇**: [ESBuild 打包](/core/bundler-esbuild)  
📖 **下一篇**: [Micro-frontend](/advanced/micro-frontend)