import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'UmiJS 源码深度解析',
  description: '深入理解企业级前端框架',
  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/overview' },
      { text: '架构', link: '/architecture/overview' },
      { text: '核心', link: '/core/app-service' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '概览', link: '/guide/overview' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '项目结构', link: '/guide/project-structure' },
            { text: '调试指南', link: '/guide/debugging' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: '架构',
          items: [
            { text: '整体架构', link: '/architecture/overview' },
            { text: '插件系统', link: '/architecture/plugin-system' },
            { text: '配置系统', link: '/architecture/config-system' },
            { text: '路由系统', link: '/architecture/routing-system' },
            { text: 'Preset 机制', link: '/architecture/preset-mechanism' }
          ]
        }
      ],
      '/core/': [
        {
          text: '核心模块',
          items: [
            { text: 'App 服务', link: '/core/app-service' },
            { text: 'CLI', link: '/core/cli' },
            { text: 'MFSU', link: '/core/mfsu' },
            { text: 'Webpack 打包器', link: '/core/bundler-webpack' },
            { text: 'Vite 打包器', link: '/core/bundler-vite' },
            { text: 'ESBuild 打包器', link: '/core/bundler-esbuild' },
            { text: '插件开发', link: '/core/plugin-development' }
          ]
        }
      ]
    }
  }
})