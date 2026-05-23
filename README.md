# UmiJS 源码深度解析

> 📚 深入理解 UmiJS 插件化架构、MFSU 加速、约定式路由等核心机制

[![UmiJS Version](https://img.shields.io/badge/umi-5.x-blue)](https://github.com/umijs/umi)
[![VitePress](https://img.shields.io/badge/docs-vitepress-green)](https://vitepress.dev/)

---

## 📖 在线阅读

**👉 [https://xuyuxiong.github.io/umi-source-code-analysis/](https://xuyuxiong.github.io/umi-source-code-analysis/)**

---

## 🎯 项目介绍

本项目是对 UmiJS v5.x 版本的源码深度解析文档，所有内容基于本地源码`/Users/xilin/Documents/sources/umi/`编写。

通过分析源码，你将深入理解：

- 🏗️ **架构设计** - Monorepo 结构、插件系统、配置系统、路由系统
- 🔌 **插件化架构** - Plugin API、Hook 机制、App 服务、生命周期管理
- ⚡ **MFSU 加速** - Module Federation 模块联邦加速原理与实现
- 📦 **多打包器** - Webpack、Vite、ESBuild 三种打包器的适配与配置
- 🛣️ **路由系统** - 约定式路由与声明式路由的生成与管理
- 🔧 **CLI 架构** - 命令行工具设计与实现

---

## 📁 项目结构

```
umi-source-code-analysis/
├── docs/                      # 文档目录
│   ├── .vitepress/           # VitePress 配置
│   │   └── config.ts         # 配置文件
│   ├── guide/                # 指南篇 (4 篇)
│   ├── architecture/         # 架构篇 (5 篇)
│   ├── core/                 # 核心篇 (14 篇)
│   ├── advanced/             # 进阶篇 (6 篇)
│   ├── public/               # 静态资源 (Logo 等)
│   └── index.md              # 首页
├── ACCURACY_REPORT.md        # 准确性验证报告 (98% 准确率)
├── package.json              # 项目配置
└── README.md                 # 项目说明
```

---

## 📚 文档目录

### 指南篇 (4 篇)
- [概览](docs/guide/overview.md) - UmiJS 是什么、核心特性
- [快速开始](docs/guide/quick-start.md) - 源码克隆、安装依赖、构建
- [源码结构](docs/guide/project-structure.md) - Monorepo 架构、包间依赖
- [调试指南](docs/guide/debugging.md) - VSCode 调试配置、断点技巧

### 架构篇 (5 篇)
- [整体架构](docs/architecture/overview.md) - 分层架构、请求生命周期
- [插件系统](docs/architecture/plugin-system.md) - 插件 API、Hook 机制
- [配置系统](docs/architecture/config-system.md) - 配置项、配置合并
- [路由系统](docs/architecture/routing-system.md) - 约定式/配置式路由
- [Preset 机制](docs/architecture/preset-mechanism.md) - preset-umi 源码分析

### 核心篇 (14 篇)
| 文档 | 核心内容 |
|------|----------|
| [App 服务](docs/core/app-service.md) | App.tsx、插件执行流程 |
| [CLI](docs/core/cli.md) | 命令行架构、yParser、命令生命周期 |
| [配置加载](docs/core/config-loading.md) | 多环境配置、热重载、验证系统 |
| [路由生成](docs/core/route-generation.md) | 文件扫描、路由转换 |
| [MFSU](docs/core/mfsu.md) | Module Federation、依赖预编译 |
| [Webpack 打包](docs/core/bundler-webpack.md) | 配置生成、loader、插件 |
| [Vite 打包](docs/core/bundler-vite.md) | ESM 开发服务器、HMR |
| [ESBuild 打包](docs/core/bundler-esbuild.md) | 极速构建、代码分割 |
| [React 渲染器](docs/core/renderer-react.md) | 浏览器端/服务端渲染 |
| [插件开发](docs/core/plugin-development.md) | 自定义插件开发指南 |
| [运行时插件](docs/core/runtime-plugin.md) | onRouteChange 等钩子 |
| [服务端插件](docs/core/buildtime-plugin.md) | modifyConfig 等钩子 |
| [类型系统](docs/core/type-system.md) | TypeScript 类型定义 |
| [工具函数](docs/core/utils.md) | 路径处理、文件操作 |

### 进阶篇 (6 篇)
- [AST 转换](docs/advanced/ast-transform.md) - Babel 插件、SWC 集成
- [Micro-frontend](docs/advanced/micro-frontend.md) - qiankun 集成
- [性能优化](docs/advanced/performance.md) - 代码分割、Tree Shaking
- [自定义打包器](docs/advanced/custom-bundler.md) - 扩展打包器
- [最佳实践](docs/advanced/best-practices.md) - 最佳实践与 FAQ

---

## 🚀 本地开发

```bash
# 克隆项目
git clone https://github.com/xuyuxiong/umi-source-code-analysis.git
cd umi-source-code-analysis

# 安装依赖
pnpm install

# 开发模式（本地预览）
pnpm docs:dev

# 构建静态站点
pnpm docs:build

# 预览构建结果
pnpm docs:preview
```

---

## 📊 项目统计

| 指标 | 数量 |
|------|------|
| **文档总数** | 29 篇 |
| **指南篇** | 4 篇 |
| **架构篇** | 5 篇 |
| **核心篇** | 14 篇 |
| **进阶篇** | 6 篇 |
| **准确性验证** | 98% ✅ |
| **源码验证点** | 50+ 处 |

---

## 🔗 相关项目

### 源码解析系列

- [Vue 源码深度解析](https://github.com/xuyuxiong/vue-source-code-analysis) - 233 篇
- [LangChainJS 源码深度解析](https://github.com/xuyuxiong/langchainjs-source-code-analysis) - 175 篇
- [Ant Design X 源码深度解析](https://github.com/xuyuxiong/ant-design-x-source-code-analysis) - 169 篇
- [qiankun 源码深度解析](https://github.com/xuyuxiong/qiankun-source-code-analysis) - 164 篇
- [lowcode-engine 源码深度解析](https://github.com/xuyuxiong/lowcode-engine-source-code-analysis) - 164 篇
- [NestJS 源码深度解析](https://github.com/xuyuxiong/nest-source-code-analysis) - 166 篇
- **UmiJS 源码深度解析** (本项目) - 29 篇

### 官方资源

- [UmiJS 官方文档](https://umijs.org/)
- [UmiJS GitHub](https://github.com/umijs/umi)
- [Plugin API](https://umijs.org/docs/api/plugin-api)

---

## 📝 关于本文档

本文档基于 UmiJS **v4.6.55** 版本源码编写，所有代码示例和分析均基于本地源码`/Users/xilin/Documents/sources/umi/`。

文档特点：
- ✅ **源码驱动**：所有内容基于实际源码，包含准确的源码路径和代码片段
- ✅ **深度解析**：每篇核心文档 6000-15000 字，包含完整的源码分析
- ✅ **实战导向**：提供调试技巧、常见问题源码级解答
- ✅ **持续更新**：跟随源码更新，保持文档准确性

---

## 📄 许可证

MIT License

---

<div align="center">

**🌟 如果本项目对你有帮助，欢迎 Star 支持！**

</div>