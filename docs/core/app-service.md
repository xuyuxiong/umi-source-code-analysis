# App 服务

## 概述

`@umijs/core` 是整个 UmiJS 框架的核心包，提供了基础服务、插件系统、配置系统和路由系统。本文档深入分析 `Service` 类及其相关组件的实现。

## Service 类

`Service` 是 Umi 的核心引擎，负责整个应用的生命周期管理。

### 类定义

```typescript
// packages/core/src/service/service.ts

export class Service {
  // ========== 核心状态 ==========
  
  // 插件注册表
  plugins: Record<string, Plugin> = {};
  
  // Hook 注册表
  hooks: Record<string, Hook[]> = {};
  
  // 命令注册表
  commands: Record<string, Command> = {};
  
  // 生成器注册表
  generators: Record<string, Generator> = {};
  
  // 当前阶段
  stage: ServiceStage = ServiceStage.uninitialized;
  
  // ========== 配置相关 ==========
  
  // 用户配置
  userConfig: Record<string, any> = {};
  
  // 最终配置
  config: Record<string, any> = {};
  
  // 默认配置
  configDefaults: Record<string, any> = {};
  
  // 配置 Schemas
  configSchemas: Record<string, any> = {};
  
  // ========== 路径相关 ==========
  
  // 路径对象
  paths: {
    cwd?: string;
    absSrcPath?: string;
    absPagesPath?: string;
    absTmpPath?: string;
    absOutputPath?: string;
  } = {};
  
  // ========== 运行时数据 ==========
  
  // 应用数据
  appData: Record<string, any> = {};
  
  // 当前环境
  env: Env;
  
  // 当前命令名
  name: string = '';
  
  // 命令行参数
  args: yParser.Arguments = { _: [], $0: '' };
}
```

### 生命周期阶段

```typescript
// packages/core/src/types.ts

export enum ServiceStage {
  uninitialized = 'uninitialized',  // 未初始化
  init = 'init',                      // 初始化
  initPresets = 'initPresets',       // 初始化 Presets
  initPlugins = 'initPlugins',       // 初始化 Plugins
  resolveConfig = 'resolveConfig',   // 解析配置
  collectAppData = 'collectAppData', // 收集应用数据
  onCheck = 'onCheck',               // 检查阶段
  onStart = 'onStart',               // 启动阶段
  runCommand = 'runCommand',         // 执行命令
}
```

### run() 方法详解

`run()` 是 Service 的核心方法，负责整个启动流程。

```typescript
async run(opts: { name: string; args?: any }) {
  const { name, args = {} } = opts;
  
  // 1. 处理命令行参数
  args._ = args._ || [];
  if (args._[0] === name) args._.shift();
  this.args = args;
  this.name = name;

  // ========== 阶段 1: 初始化 ==========
  this.stage = ServiceStage.init;
  
  // 2. 加载环境变量
  loadEnv({ cwd: this.cwd, envFile: '.env' });
  
  // 3. 读取 package.json
  let pkg: Record<string, any> = {};
  let pkgPath: string = '';
  try {
    pkg = require(join(this.cwd, 'package.json'));
    pkgPath = join(this.cwd, 'package.json');
  } catch (_e) {
    // 处理 APP_ROOT 场景
  }
  this.pkg = pkg;
  this.pkgPath = pkgPath;

  // ========== 阶段 2: 配置加载 ==========
  const configManager = new Config({
    cwd: this.cwd,
    env: this.env,
    defaultConfigFiles: this.opts.defaultConfigFiles,
    specifiedEnv: process.env[`${this.frameworkName}_ENV`],
  });
  this.configManager = configManager;
  this.userConfig = configManager.getUserConfig().config;

  // ========== 阶段 3: 获取路径 ==========
  this.paths = await this.getPaths();

  // ========== 阶段 4: 解析插件 ==========
  const { plugins, presets } = Plugin.getPluginsAndPresets({
    cwd: this.cwd,
    pkg,
    plugins: [
      require.resolve('./generatePlugin')
    ].concat(this.opts.plugins || []),
    presets: [
      require.resolve('./servicePlugin')
    ].concat(this.opts.presets || []),
    userConfig: this.userConfig,
    prefix: this.frameworkName,
  });

  // ========== 阶段 5: 注册 Presets ==========
  this.stage = ServiceStage.initPresets;
  const presetPlugins: Plugin[] = [];
  while (presets.length) {
    await this.initPreset({
      preset: presets.shift()!,
      presets,
      plugins: presetPlugins,
    });
  }
  plugins.unshift(...presetPlugins);

  // ========== 阶段 6: 注册 Plugins ==========
  this.stage = ServiceStage.initPlugins;
  while (plugins.length) {
    await this.initPlugin({
      plugin: plugins.shift()!,
      plugins,
    });
  }

  // ========== 阶段 7: 解析配置 ==========
  this.stage = ServiceStage.resolveConfig;
  const { defaultConfig } = await this.resolveConfig();
  
  // 更新输出路径
  if (this.config.outputPath) {
    this.paths.absOutputPath = isAbsolute(this.config.outputPath)
      ? this.config.outputPath
      : join(this.cwd, this.config.outputPath);
  }

  // ========== 阶段 8: 修改路径 ==========
  this.paths = await this.applyPlugins({
    key: 'modifyPaths',
    initialValue: this.paths,
  });

  // ========== 阶段 9: 收集应用数据 ==========
  this.stage = ServiceStage.collectAppData;
  this.appData = await this.applyPlugins({
    key: 'modifyAppData',
    initialValue: {
      cwd: this.cwd,
      pkg,
      pkgPath,
      plugins: this.plugins,
      presets,
      name,
      args,
      userConfig: this.userConfig,
      mainConfigFile: configManager.mainConfigFile,
      config: this.config,
      defaultConfig: defaultConfig,
    },
  });

  // ========== 阶段 10: 检查 ==========
  this.stage = ServiceStage.onCheck;
  await this.applyPlugins({ key: 'onCheck' });

  // ========== 阶段 11: 启动 ==========
  this.stage = ServiceStage.onStart;
  await this.applyPlugins({ key: 'onStart' });

  // ========== 阶段 12: 执行命令 ==========
  this.stage = ServiceStage.runCommand;
  let ret = await this.commands[name].fn({ args });
  
  // 性能分析
  this._profilePlugins();
  
  return ret;
}
```

## applyPlugins() 方法

`applyPlugins` 是 Hook 系统的核心方法，支持三种类型的 Hook 执行。

### 方法签名

```typescript
applyPlugins<T>(opts: {
  key: string;
  type?: ApplyPluginsType;
  initialValue?: any;
  args?: any;
  sync?: boolean;
}): Promise<T> | T
```

### Hook 类型枚举

```typescript
// packages/core/src/types.ts

export enum ApplyPluginsType {
  event = 'event',      // 事件类型
  modify = 'modify',    // 修改类型
  add = 'add',          // 添加类型
}
```

### Event 类型实现

```typescript
case ApplyPluginsType.event:
  const tEvent = new AsyncSeriesWaterfallHook(['_']);
  for (const hook of hooks) {
    if (!this.isPluginEnable(hook)) continue;
    tEvent.tapPromise(
      {
        name: hook.plugin.key,
        stage: hook.stage || 0,
        before: hook.before,
      },
      async () => {
        const dateStart = new Date();
        await hook.fn(opts.args);
        hook.plugin.time.hooks[opts.key] ||= [];
        hook.plugin.time.hooks[opts.key].push(
          new Date().getTime() - dateStart.getTime()
        );
      },
    );
  }
  return tEvent.promise(1);
```

### Modify 类型实现

```typescript
case ApplyPluginsType.modify:
  const tModify = new AsyncSeriesWaterfallHook(['memo']);
  for (const hook of hooks) {
    if (!this.isPluginEnable(hook)) continue;
    tModify.tapPromise(
      {
        name: hook.plugin.key,
        stage: hook.stage || 0,
        before: hook.before,
      },
      async (memo: any) => {
        const dateStart = new Date();
        const ret = await hook.fn(memo, opts.args);
        hook.plugin.time.hooks[opts.key] ||= [];
        hook.plugin.time.hooks[opts.key].push(
          new Date().getTime() - dateStart.getTime()
        );
        return ret;
      },
    );
  }
  return tModify.promise(opts.initialValue);
```

### Add 类型实现

```typescript
case ApplyPluginsType.add:
  const tAdd = new AsyncSeriesWaterfallHook(['memo']);
  for (const hook of hooks) {
    if (!this.isPluginEnable(hook)) continue;
    tAdd.tapPromise(
      {
        name: hook.plugin.key,
        stage: hook.stage || 0,
        before: hook.before,
      },
      async (memo: any) => {
        const dateStart = new Date();
        const items = await hook.fn(opts.args);
        hook.plugin.time.hooks[opts.key] ||= [];
        hook.plugin.time.hooks[opts.key].push(
          new Date().getTime() - dateStart.getTime()
        );
        return memo.concat(items);
      },
    );
  }
  return tAdd.promise(opts.initialValue || []);
```

## 插件初始化

### initPlugin()

```typescript
async initPlugin(opts: {
  plugin: Plugin;
  presets?: Plugin[];
  plugins: Plugin[];
}) {
  // 1. 注册到插件表
  this.plugins[opts.plugin.id] = opts.plugin;

  // 2. 创建插件 API
  const pluginAPI = new PluginAPI({
    plugin: opts.plugin,
    service: this,
  });

  // 3. 创建代理 API
  const proxyPluginAPI = PluginAPI.proxyPluginAPI({
    service: this,
    pluginAPI,
    serviceProps: [
      'appData', 'applyPlugins', 'args', 'config',
      'cwd', 'pkg', 'paths', 'userConfig', 'env',
      'isPluginEnable'
    ],
    staticProps: {
      ApplyPluginsType,
      ConfigChangeType,
      EnableBy,
      ServiceStage,
      service: this,
    },
  });

  // 4. 执行插件
  let dateStart = new Date();
  let ret = await opts.plugin.apply()(proxyPluginAPI);
  opts.plugin.time.register = new Date().getTime() - dateStart.getTime();

  // 5. 注册 key 映射
  assert(
    !this.keyToPluginMap[opts.plugin.key],
    `key ${opts.plugin.key} is already registered`
  );
  this.keyToPluginMap[opts.plugin.key] = opts.plugin;

  // 6. 处理返回值 (额外的 presets/plugins)
  if (ret?.presets) {
    ret.presets = ret.presets.map(
      (preset) => new Plugin({ path: preset, type: PluginType.preset, cwd: this.cwd })
    );
  }
  if (ret?.plugins) {
    ret.plugins = ret.plugins.map(
      (plugin) => new Plugin({ path: plugin, type: PluginType.plugin, cwd: this.cwd })
    );
  }
  return ret || {};
}
```

## 配置解析

### resolveConfig()

```typescript
async resolveConfig() {
  assert(this.stage > ServiceStage.init, 'Can't generate final config before init stage');

  // 1. 应用 modifyConfig Hook
  const config = await this.applyPlugins({
    key: 'modifyConfig',
    initialValue: lodash.cloneDeep(
      this.configManager!.getConfig({ schemas: this.configSchemas }).config
    ),
    args: { paths: this.paths },
  });
  
  // 2. 应用 modifyDefaultConfig Hook
  const defaultConfig = await this.applyPlugins({
    key: 'modifyDefaultConfig',
    initialValue: lodash.cloneDeep(this.configDefaults),
  });
  
  // 3. 合并配置
  this.config = lodash.merge(defaultConfig, config);

  return { config, defaultConfig };
}
```

## 插件启用检查

### isPluginEnable()

```typescript
isPluginEnable(hook: Hook | string) {
  let plugin: Plugin;
  if ((hook as Hook).plugin) {
    plugin = (hook as Hook).plugin;
  } else {
    plugin = this.keyToPluginMap[hook as string];
    if (!plugin) return false;
  }
  
  const { id, key, enableBy } = plugin;
  
  // 1. 检查是否被跳过
  if (this.skipPluginIds.has(id)) return false;
  
  // 2. 检查用户配置
  if (this.userConfig[key] === false) return false;
  
  // 3. 检查最终配置
  if (this.config && this.config[key] === false) return false;
  
  // 4. 检查 enableBy 条件
  if (enableBy === EnableBy.config) {
    return key in this.userConfig || (this.config && key in this.config);
  }
  
  if (typeof enableBy === 'function') {
    return enableBy({
      userConfig: this.userConfig,
      config: this.config,
      env: this.env,
    });
  }
  
  // 5. 默认启用
  return true;
}
```

## 性能分析

### _profilePlugins()

```typescript
_profilePlugins() {
  if (this.args.profilePlugins) {
    console.log();
    Object.keys(this.plugins)
      .map((id) => {
        const plugin = this.plugins[id];
        const total = totalTime(plugin);
        return { id, total, register: plugin.time.register || 0, hooks: plugin.time.hooks };
      })
      .filter((time) => time.total > (this.args.profilePluginsLimit ?? 10))
      .sort((a, b) => b.total > a.total ? 1 : -1)
      .forEach((time) => {
        console.log(chalk.green('plugin'), time.id, time.total);
        if (this.args.profilePluginsVerbose) {
          console.log('      ', chalk.green('register'), time.register);
          console.log('      ', chalk.green('hooks'), JSON.stringify(sortHooks(time.hooks)));
        }
      });
  }
}
```

## 总结

`@umijs/core` 的 `Service` 类是 Umi 框架的心脏，负责：

1. **生命周期管理** - 控制整个应用的启动和执行流程
2. **插件系统** - 管理插件的注册和执行
3. **Hook 系统** - 实现插件间的通信机制
4. **配置系统** - 加载和处理配置
5. **路径管理** - 计算和管理各种路径

深入理解 `Service` 类是掌握 UmiJS 框架的关键。

---

📖 **上一篇**: [Preset 机制](/architecture/preset-mechanism)
📖 **下一篇**: [命令行架构](/core/cli-architecture)