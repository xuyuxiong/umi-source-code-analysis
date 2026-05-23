---
layout: home

title: UmiJS 源码深度解析
titleTemplate: 深入理解企业级前端框架设计与实现

hero:
  name: UmiJS
  text: 源码深度解析
  tagline: 深入理解企业级前端框架设计与实现
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
    title: 架构篇
    details: 深入理解 UmiJS 分层架构、插件系统、配置系统和路由系统
    link: /architecture/overview
    
  - icon: 🔧
    title: 核心篇
    details: 解析 CLI、配置加载、路由生成、MFSU、打包器等核心模块
    link: /core/cli
    
  - icon: 🚀
    title: 进阶篇
    details: 探索 AST 转换、微前端集成、性能优化等高级主题
    link: /advanced/ast-transform
    
  - icon: 📦
    title: Monorepo 管理
    details: 深入理解 pnpm + Turborepo 的 Monorepo 架构
    link: /guide/project-structure
    
  - icon: 🔌
    title: 插件化架构
    details: 了解如何通过插件系统扩展框架功能
    link: /architecture/plugin-system
    
  - icon: ⚡
    title: 构建加速
    details: MFSU 模块联邦加速原理与实现
    link: /core/mfsu
---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 动态更新副标题
  const tagline = document.querySelector('.VPHomeHero .tagline')
  if (tagline) {
    tagline.textContent = '深入理解企业级前端框架设计与实现 · 基于源码分析'
  }
})
</script>

<div class="custom-section">
  <h2>为什么学习 UmiJS 源码？</h2>
  <p>UmiJS 是蚂蚁集团开源的企业级前端框架，被广泛应用于各种大型项目中。学习 UmiJS 源码可以帮助你：</p>
  <ul>
    <li>🎯 深入理解现代前端框架构建工具的设计思想</li>
    <li>📚 掌握插件化架构的实现方式</li>
    <li>🔍 了解 Monorepo 项目管理和构建优化</li>
    <li>💡 提升前端工程化能力</li>
  </ul>
</div>

<div class="custom-section highlight">
  <h2>文档特点</h2>
  <ul>
    <li>📖 <strong>基于源码</strong> - 所有内容基于实际源码编写，确保准确性</li>
    <li>🔬 <strong>深度解析</strong> - 不只停留在表面，深入实现细节</li>
    <li>📊 <strong>可视化图表</strong> - 大量图表帮助理解复杂概念</li>
    <li>🧪 <strong>实践导向</strong> - 提供调试方法和实践技巧</li>
  </ul>
</div>

<div class="custom-section">
  <h2>路线图</h2>
  <div class="roadmap">
    <div class="step">
      <span class="step-number">1</span>
      <h3>指南篇</h3>
      <p>快速上手，了解项目结构和调试方法</p>
    </div>
    <div class="step">
      <span class="step-number">2</span>
      <h3>架构篇</h3>
      <p>理解整体架构、插件系统、配置系统、路由系统</p>
    </div>
    <div class="step">
      <span class="step-number">3</span>
      <h3>核心篇</h3>
      <p>深入各个核心模块的实现细节</p>
    </div>
    <div class="step">
      <span class="step-number">4</span>
      <h3>进阶篇</h3>
      <p>探索 AST 转换、微前端、性能优化</p>
    </div>
  </div>
</div>

<style>
.custom-section {
  max-width: 900px;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.custom-section h2 {
  color: var(--vp-c-brand);
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.custom-section ul {
  list-style: none;
  padding: 0;
}

.custom-section li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.custom-section li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--vp-c-brand);
}

.custom-section.highlight {
  background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-bg-soft));
  border: 1px solid var(--vp-c-brand);
}

.roadmap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.step {
  padding: 1.5rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--vp-c-divider);
}

.step-number {
  display: inline-block;
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  background: var(--vp-c-brand);
  color: white;
  border-radius: 50%;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.step h3 {
  margin: 1rem 0 0.5rem;
  color: var(--vp-c-text-1);
}

.step p {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
</style>