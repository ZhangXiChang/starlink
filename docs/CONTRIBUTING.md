# 贡献指南

非常感谢您对 Pupu 的关注和贡献！在您提交贡献之前，请先花一些时间阅读以下指南，以确保您的贡献能够顺利进行。

## 透明的开发

所有工作都在 GitHub 上公开进行。无论是核心团队成员还是外部贡献者的 Pull Request，都需要经过相同的 Review 流程。

## 提交 Issue

我们使用 [Github Issues](https://github.com/zhangxichang/pupu/issues) 进行 Bug 报告和新 Feature 建议。在提交 Issue 之前，请确保已经搜索过类似的问题，因为它们可能已经得到解答或正在被修复。对于 Bug 报告，请包含可用于重现问题的完整步骤。对于新 Feature 建议，请指出你想要的更改以及期望的行为。

## 提交 Pull Request

### 共建流程

- 认领 issue：在 Github 建立 Issue 并认领（或直接认领已有 Issue），告知大家自己正在修复，避免重复工作。
- 项目开发：在完成准备工作后，进行 Bug 修复或功能开发。
- 提交 PR。

### 准备工作

- [Tauri](https://v2.tauri.app/start/prerequisites): 原生应用开发框架
- [Bun](https://bun.com/docs/installation): 前端包管理工具
- [uv](https://docs.astral.sh/uv/getting-started/installation): 项目脚本语言
- [wasm32-unknown-unknown](https://doc.rust-lang.org/beta/rustc/platform-support/wasm32-unknown-unknown.html): 执行`rustup target install wasm32-unknown-unknown`安装
- [wasm-pack](https://drager.github.io/wasm-pack/installer): Rust WebAssembly 构建工具  
_如果你要进行安卓开发_
- [AndroidSDK](https://developer.android.com/studio): 通过AndroidStudio安装AndroidSDK

### 初始化

```bash
bun run install:pre
bun install
bun run install:post
#如果你要进行安卓开发
bun run android:init
bun run generate:icon
```

### 开发

```bash
#Web
bun run dev
#安卓
bun run android:dev
#原生
bun run native:dev
```

### 打包构建应用

```bash
#Web
bun run build
#安卓
bun run android:build
#原生
bun run native:build
```

## 开发规范

- 函数与变量命名遵循 `snake_case` 风格

## Commit 指南

Commit messages 请遵循 [conventionalcommits](https://www.conventionalcommits.org/zh-hans/v1.0.0)。

### Commit 类型

以下是常用 commit 类型列表:

- fix: 缺陷修复
- feat: 新特性或功能
- docs: 文档更新
- chore: 其他提交

期待您的参与，让我们一起使 Pupu 变得更好！
