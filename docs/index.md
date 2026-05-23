---
layout: home

hero:
  name: UmiJS 源码深度解析
  text: 深入理解企业级前端框架
  tagline: 深入解析 UmiJS 插件化架构、MFSU 加速、约定式路由等核心机制
  image:
    src: /logo.svg
    alt: UmiJS Logo
  actions:
    - theme: brand
      text: 开始阅读
      link: /guide/overview
    - theme: alt
      text: GitHub
      link: https://github.com/umijs/umi

features:
  - icon: 🏗️
    title: 架构深度解析
    details: 从 Monorepo 结构到插件系统，全面剖析 UmiJS 架构设计理念
    link: /architecture/overview
    
  - icon: 🔍
    title: 源码逐行分析
    details: 基于真实源码，逐行解读 CLI、配置加载、路由生成、MFSU 等核心模块
    link: /guide/project-structure
    
  - icon: 🔌
    title: 插件化架构
    details: 深入理解 Preset、Hook 机制、App 服务等插件系统核心概念
    link: /architecture/plugin-system
    
  - icon: ⚡
    title: MFSU 加速
    details: 详解 Module Federation 模块联邦加速原理与实现
    link: /core/mfsu
    
  - icon: 📦
    title: 多打包器支持
    details: Webpack、Vite、ESBuild 三种打包器的适配与配置
    link: /core/bundler-webpack
    
  - icon: 🛣️
    title: 路由系统
    details: 约定式路由与声明式路由的生成与管理
    link: /core/route-generation
---

## 为什么学习 UmiJS 源码？

UmiJS 是蚂蚁集团开源的企业级前端应用框架，它提供了：

- **插件化架构**：通过 Plugin API 实现高度可扩展的插件系统
- **约定式路由**：基于文件结构的智能路由生成
- **MFSU 加速**：Module Federation 实现的快速启动与构建
- **多打包器支持**：Webpack、Vite、ESBuild 按需选择
- **微前端集成**：与 qiankun 无缝集成，支持大型应用架构
- **全栈能力**：支持 SSR、API 路由、服务端渲染等全栈场景

通过深入学习源码，你将：

- 📚 **掌握框架设计模式** - 理解 Plugin API、App 服务、生命周期管理等核心设计
- 🛠️ **提升工程化能力** - 学习大型前端框架的架构设计与模块划分
- 🚀 **优化构建性能** - 理解 MFSU、代码分割、Tree Shaking 等优化技术
- 💡 **扩展开发能力** - 学会自定义插件、自定义打包器等高级技能

---

## 📂 源码结构

```
umi/
├── packages/
│   ├── core/              # 核心包 - App 服务、配置、路由
│   ├── umi/               # 主包 - CLI、服务入口
│   ├── preset-umi/        # Umi Preset - 核心功能实现
│   ├── renderer-react/    # React 渲染器
│   ├── bundler-webpack/   # Webpack 打包器
│   ├── bundler-vite/      # Vite 打包器
│   ├── bundler-esbuild/   # ESBuild 打包器
│   ├── mfsu/              # MFSU 模块联邦
│   ├── plugins/           # 插件集合
│   └── max/               # 全功能版本
├── libs/                  # 共享库
├── ui/                    # UI 组件
└── examples/              # 示例项目
```

---

## 📚 文档导航

| 分类 | 内容 |
|------|------|
| **指南篇** | 框架概览、快速开始、源码结构、调试指南 |
| **架构篇** | 整体架构、插件系统、配置系统、路由系统、Preset 机制 |
| **核心篇** | App 服务、CLI、MFSU、打包器、渲染器、插件开发 |
| **进阶篇** | AST 转换、微前端、性能优化、最佳实践 |

---

## 🚀 快速开始

```bash
# 克隆源码
git clone https://github.com/umijs/umi.git
cd umi

# 安装依赖
pnpm install

# 构建
pnpm build

# 开发模式
pnpm dev
```

详细搭建指南请查看 [快速开始](/guide/quick-start)

---

## 📖 关于本文档

本文档基于 UmiJS **v5.x** 版本源码编写，所有代码示例和分析均基于本地源码 `/Users/xilin/Documents/sources/umi/`。

文档特点：
- ✅ **源码驱动**：所有内容基于实际源码，包含准确的源码路径和代码片段
- ✅ **深度解析**：每篇核心文档 6000-15000 字，包含完整的源码分析
- ✅ **实战导向**：提供调试技巧、常见问题源码级解答
- ✅ **持续更新**：跟随源码更新，保持文档准确性

与 [Vue](/vue-source-code-analysis)、[NestJS](/nest-source-code-analysis)、[qiankun](/qiankun-source-code-analysis) 等源码解析项目风格保持一致。