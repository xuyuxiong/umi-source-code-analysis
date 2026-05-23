# 服务端插件（编译时插件）

## 概述

编译时插件在服务端执行，用于修改配置、添加命令等。

## Hook 类型

### modifyConfig

```typescript
api.modifyConfig((memo) => {
  memo.alias['@'] = api.paths.absSrcPath;
  return memo;
});
```

### addHTMLHeadScripts

```typescript
api.addHTMLHeadScripts(() => {
  return [
    {
      content: `console.log('hello')`,
    },
  ];
});
```

### onGenerateFiles

```typescript
api.onGenerateFiles(() => {
  api.writeTmpFile({
    path: 'plugin.ts',
    content: `export default {}`,
  });
});
```
