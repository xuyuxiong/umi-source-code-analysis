# 最佳实践与 FAQ

## 项目结构

```
src/
├── pages/          # 页面
├── components/     # 组件
├── models/         # 数据模型
├── services/       # API 服务
├── utils/          # 工具函数
└── config/         # 配置文件
```

## 常见问题

### Q: 如何代理 API？

```typescript
export default {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
};
```

### Q: 如何配置 alias？

```typescript
export default {
  alias: {
    '@utils': '@/utils',
    '@components': '@/components',
  },
};
```

### Q: 如何部署到子目录？

```typescript
export default {
  base: '/my-app/',
  publicPath: '/my-app/',
};
```

## 性能建议

1. 启用 MFSU 加速开发
2. 使用懒加载减少首屏
3. 启用 gzip 压缩
4. 使用 CDN 加载大型库
