# UmiJS 源码深度解析 📚

> 深入理解 UmiJS 框架的核心架构与实现原理

[![Deploy VitePress site to Pages](https://github.com/[username]/umi-source-code-analysis/actions/workflows/deploy.yml/badge.svg)](https://github.com/[username]/umi-source-code-analysis/actions/workflows/deploy.yml)

## 🎯 项目介绍

本项目是一份全面的 UmiJS 源码分析文档，通过深入浅出的方式解析 UmiJS 框架的核心架构、设计模式和实现细节。适合想要深入理解 UmiJS 内部机制的开发者阅读。

## 📖 在线阅读

- **GitHub Pages**: [https://[username].github.io/umi-source-code-analysis](https://[username].github.io/umi-source-code-analysis)
- **本地预览**: 克隆项目后运行 `npm run docs:dev`

## 🗂️ 文档结构

### 📋 快速开始
- [项目概览](docs/guide/overview.md) - 整体介绍和学习路径
- [快速开始](docs/guide/quick-start.md) - 如何开始阅读源码
- [项目结构](docs/guide/project-structure.md) - 代码组织方式
- [调试技巧](docs/guide/debugging.md) - 源码调试方法

### 🏗️ 核心架构
- [配置系统](docs/architecture/config-system.md) - 配置加载与合并机制
- [插件系统](docs/architecture/plugin-system.md) - 插件架构与生命周期
- [预设机制](docs/architecture/preset-mechanism.md) - preset 的实现原理
- [路由系统](docs/architecture/routing-system.md) - 路由生成与管理
- [整体架构](docs/architecture/overview.md) - 宏观架构设计

### ⚙️ 核心模块
- [CLI 命令](docs/core/cli.md) - 命令行工具实现
- [配置加载](docs/core/config-loading.md) - 配置文件解析流程
- [应用服务](docs/core/app-service.md) - AppService 核心逻辑
- [构建时插件](docs/core/buildtime-plugin.md) - 构建阶段插件机制
- [运行时插件](docs/core/runtime-plugin.md) - 运行阶段插件机制
- [路由生成](docs/core/route-generation.md) - 路由自动生成算法
- [React 渲染器](docs/core/renderer-react.md) - React 集成实现
- [类型系统](docs/core/type-system.md) - TypeScript 类型设计
- [工具函数](docs/core/utils.md) - 核心工具方法
- [MFSU](docs/core/mfsu.md) - 模块联邦加速方案

### 📦 打包工具
- [Webpack 打包器](docs/core/bundler-webpack.md) - Webpack 集成实现
- [Vite 打包器](docs/core/bundler-vite.md) - Vite 集成实现
- [Esbuild 打包器](docs/core/bundler-esbuild.md) - Esbuild 集成实现

### 🚀 进阶主题
- [性能优化](docs/advanced/performance.md) - 性能分析与优化策略
- [微前端](docs/advanced/micro-frontend.md) - qiankun 集成原理
- [自定义打包器](docs/advanced/custom-bundler.md) - 如何扩展打包工具
- [AST 转换](docs/advanced/ast-transform.md) - 代码转换与优化
- [最佳实践](docs/advanced/best-practices.md) - 开发经验总结

## 🛠️ 本地开发

### 环境要求
- Node.js >= 18
- npm 或 pnpm

### 安装依赖
```bash
npm install
```

### 本地预览
```bash
npm run docs:dev
```

### 构建文档
```bash
npm run docs:build
```

### 预览构建结果
```bash
npm run docs:preview
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进文档！

### 如何贡献
1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 贡献内容
- 修复文档错误
- 补充缺失的源码分析
- 添加新的分析视角
- 改进文档的可读性

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [UmiJS 团队](https://github.com/umijs/umi) - 提供了优秀的框架
- [VitePress](https://vitepress.dev/) - 文档生成工具
- 所有贡献者 - 让这个项目变得更好

---

<div align="center">
  <sub>Built with ❤️ by the community, for the community</sub>
</div>