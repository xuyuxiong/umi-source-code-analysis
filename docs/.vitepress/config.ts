import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'UmiJS 源码深度解析',
  description: '深入理解 UmiJS 框架设计与实现',
  
  base: '/umi-source-code-analysis/',
  
  head: [
    ['link', { rel: 'icon', href: '/umi-source-code-analysis/logo.svg' }]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: {
      src: '/logo.svg',
      width: 24,
      height: 24
    },

    nav: [
      { text: '指南', link: '/guide/overview' },
      { text: '架构', link: '/architecture/overview' },
      { text: '核心', link: '/core/app-service' },
      { text: '进阶', link: '/advanced/ast-transform' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南篇',
          items: [
            { text: '概览', link: '/guide/overview' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '源码结构', link: '/guide/project-structure' },
            { text: '调试指南', link: '/guide/debugging' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: '架构篇',
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
          text: '核心篇',
          items: [
            { text: 'App 服务', link: '/core/app-service' },
            { text: '命令行架构', link: '/core/cli-architecture' },
            { text: '配置加载', link: '/core/config-loading' },
            { text: '路由生成', link: '/core/route-generation' },
            { text: 'MFSU 实现', link: '/core/mfsu-implementation' },
            { text: 'Webpack 打包', link: '/core/webpack-bundler' },
            { text: 'Vite 打包', link: '/core/vite-bundler' },
            { text: 'ESBuild 打包', link: '/core/esbuild-bundler' },
            { text: 'React 渲染器', link: '/core/react-renderer' },
            { text: '插件开发', link: '/core/plugin-development' },
            { text: '运行时插件', link: '/core/runtime-plugins' },
            { text: '服务端插件', link: '/core/server-plugins' },
            { text: '类型系统', link: '/core/type-system' },
            { text: '工具函数', link: '/core/utils' }
          ]
        }
      ],
      '/advanced/': [
        {
          text: '进阶篇',
          items: [
            { text: '源码编译', link: '/advanced/ast-transform' },
            { text: 'Micro-frontend', link: '/advanced/micro-frontend' },
            { text: '性能优化', link: '/advanced/performance-optimization' },
            { text: '自定义打包器', link: '/advanced/custom-bundler' },
            { text: '最佳实践与 FAQ', link: '/advanced/best-practices' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/umijs/umi' }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    }
  },

  markdown: {
    theme: {
      light: 'vitesse-light',
      dark: 'vitesse-dark'
    }
  }
})