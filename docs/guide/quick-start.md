# 快速开始

## 源码克隆

### 1. 克隆 UmiJS 仓库

首先需要克隆 UmiJS 的源码仓库：

```bash
# 克隆仓库
git clone https://github.com/umijs/umi.git

# 进入项目目录
cd umi
```

### 2. 安装依赖

Umi 使用 pnpm 进行依赖管理。由于这是一个 Monorepo 项目，需要使用 pnpm workspace 功能：

```bash
# 安装 pnpm (如果未安装)
npm install -g pnpm

# 安装所有依赖
pnpm install
```

### 3. 构建项目

安装依赖后，需要构建所有子包：

```bash
# 构建所有包
pnpm run build

# 或者只构建特定包
pnpm run build --filter=@umijs/core
```

### 4. 启动开发模式

```bash
# 开发模式 (带 watch)
pnpm run dev
```

## 项目结构图解

```
umi/
├── .github/                 # GitHub 配置 (CI/CD, Issues)
├── .husky/                  # Git hooks 配置
├── docs/                    # 官方文档源码
├── examples/                # 示例项目
├── packages/                # 核心包目录
│   ├── core/               # @umijs/core - 核心服务
│   ├── umi/                # @umijs/umi - 主包
│   ├── preset-umi/         # @umijs/preset-umi - Preset 实现
│   ├── renderer-react/     # @umijs/renderer-react - React 渲染器
│   ├── bundler-webpack/    # @umijs/bundler-webpack - Webpack 打包器
│   ├── bundler-vite/       # @umijs/bundler-vite - Vite 打包器
│   ├── bundler-esbuild/    # @umijs/bundler-esbuild - ESBuild 打包器
│   ├── mfsu/               # @umijs/mfsu - 模块联邦加速
│   ├── plugins/            # @umijs/plugins - 插件集合
│   ├── max/                # @umijs/max - 全功能版本
│   ├── utils/              # @umijs/utils - 工具函数
│   ├── lint/               # @umijs/lint - 代码检查
│   └── ... (更多官方包)
├── scripts/                 # 构建脚本
├── package.json            # 根 package.json
├── pnpm-workspace.yaml     # pnpm workspace 配置
└── turbo.json              # Turborepo 配置
```

## 调试方法

### 1. 使用示例项目调试

在 `examples` 目录下有多个示例项目，可以直接使用：

```bash
# 进入示例项目
cd examples/normal

# 使用本地 umi 运行
pnpm dev
```

### 2. 创建调试项目

```bash
# 创建测试项目
mkdir test-umi-debug
cd test-umi-debug

# 初始化 package.json
npm init -y

# 链接本地 umi
pnpm link /Users/xilin/Documents/sources/umi/packages/umi

# 创建简单配置
cat > .umirc.ts << 'EOF'
export default {
  npmClient: 'pnpm',
}
EOF

# 创建页面
mkdir -p src/pages
cat > src/pages/index.tsx << 'EOF'
export default function Home() {
  return <h1>Hello Umi!</h1>
}
EOF

# 运行
pnpm dev
```

### 3. 使用 VS Code 调试

创建 `.vscode/launch.json` 配置文件：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Umi Dev",
      "skipFiles": ["<node_internals>/**"],
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/examples/normal",
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "umi:*"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "${workspaceFolder}",
      "protocol": "inspector"
    }
  ]
}
```

### 4. 断点调试技巧

#### 方法一：Nodemon 调试

```bash
# 安装 nodemon
pnpm add -g nodemon

# 创建 nodemon.json
cat > nodemon.json << 'EOF'
{
  "watch": ["packages"],
  "ext": "ts,tsx,js,json",
  "ignore": ["dist", "node_modules"],
  "exec": "pnpm build && pnpm dev"
}
EOF
```

#### 方法二：源码直接调试

在关键位置添加断点：

```typescript
// packages/core/src/service/service.ts
async run(opts: { name: string; args?: any }) {
  debugger; // 在这里设置断点
  const { name, args = {} } = opts;
  // ...
}
```

## 核心包源码位置

### @umijs/core - 核心服务

```
packages/core/src/
├── service/
│   ├── service.ts        # 核心 Service 类 (Service 类 - 插件系统核心)
│   ├── pluginAPI.ts      # 插件 API
│   ├── plugin.ts         # 插件定义
│   ├── hook.ts           # Hook 实现
│   ├── command.ts        # 命令定义
│   └── generator.ts      # 生成器
├── config/
│   └── config.ts         # 配置系统(配置加载与验证)
├── route/
│   ├── route.ts          # 路由系统
│   ├── routesConvention.ts  # 约定式路由
│   └── routesConfig.ts      # 配置式路由
└── types/
    └── index.ts          # 类型定义
```

### @umijs/preset-umi - Preset 实现

```
packages/preset-umi/src/
├── index.ts              # 入口文件 (插件注册入口)
├── features/
│   ├── configPlugins/    # 配置插件
│   ├── tmpFiles/         # 临时文件生成 (路由/入口/插件运行时生成)
│   ├── webpack/          # Webpack 打包
│   ├── vite/             # Vite 打包
│   ├── mfsu/             # MFSU 加速
│   ├── dev/              # 开发服务器
│   ├── build/            # 构建命令
│   └── ...              # 更多特性
├── commands/             # 命令行实现
└── types.ts              # 类型定义
```

### @umijs/umi - 主包

```
packages/umi/
├── bin/
│   └── umi.js            # CLI 入口
├── client/
│   ├── client/
│   │   └── plugin.js     # 运行时插件
│   └── types.ts
└── tests/
```

## 关键源码阅读路径

### 1. 应用程序启动流程

```
bin/umi.js
  └─> Service.run()
      └─> 读取配置
      └─> 注册 Presets/Plugins
      └─> 解析最终配置
      └─> 执行命令 (dev/build/...)
```

### 2. 插件执行流程

```
Service.run()
  └─> initPresets (初始化 Presets)
      └─> plugin.apply()(pluginAPI)
  └─> initPlugins (初始化 Plugins)
      └─> plugin.apply()(pluginAPI)
  └─> resolveConfig (解析配置)
      └─> applyPlugins('modifyConfig')
  └─> runCommand (执行命令)
      └─> command.fn()
```

### 3. 临时文件生成流程

```
tmpFiles 插件
  └─> onGenerateFiles Hook
      ├─> 生成 tsconfig.json
      ├─> 生成 route.ts
      ├─> 生成 plugin.ts
      ├─> 生成 umi.ts
      └─> 生成 exports.ts
```

## 常用调试命令

```bash
# 查看所有调试日志
DEBUG=umi:* pnpm dev

# 只查看特定模块的调试日志
DEBUG=umi:config,umi:routes pnpm dev

# 启动环境调试
DEBUG=umi:env pnpm dev

# 启动插件调试
DEBUG=umi:plugin pnpm dev

# 查看性能分析
pnpm dev --profilePlugins

# 调试 MFSU
DEBUG=mfsu:* pnpm dev
```

## 构建后调试

如果需要在构建后的代码中调试：

```bash
# 构建时保留 source map
pnpm build --sourcemap

# 或者修改根目录的 package.json
{
  "scripts": {
    "build": "father build --sourcemap"
  }
}
```

## 常见问题

### 1. 构建失败

```bash
# 清理缓存
rm -rf node_modules ./*/node_modules
pnpm install

# 强制构建
pnpm run build --force
```

### 2. 模块找不到

```bash
# 重新链接所有包
pnpm build
```

### 3. TypeScript 类型错误

```bash
# 生成类型定义
pnpm run dev
```

---

📖 **下一篇**: [源码结构](/guide/project-structure)