# AI 执行日志

## 2026-10-28：INIT-003-PHASE2 初始化

### 执行范围

- 项目根目录：`D:\Ai-3D-Unity`
- Unity Editor：`D:\Unity1\6000.3.27f1\Editor\Unity.exe`
- Unity 版本：`6000.3.27f1`
- 本次仅执行 React、Go、文档和本地 Git 初始化。
- 未编写巡检业务逻辑、Go API 或 React 问题管理页面。
- 未关闭、修改、移动或删除两个 Unity 工程目录。

### 环境

```text
Node.js : v24.15.0
npm     : 11.12.1
Go      : go1.27.0 windows/amd64
Git     : 2.54.0.windows.1
Unity   : 6000.3.27f1
```

### 执行前检查

检查了根目录、两个 Unity 目录、目标新增路径和 `.git`。结果：

- 根目录为 `D:\Ai-3D-Unity`
- `unity` 和 `unity-smoke-test` 均存在
- `unity-smoke-test\Assets`、`Packages`、`ProjectSettings` 均存在
- `SampleScene.unity`、`manifest.json`、`packages-lock.json` 均存在
- `ProjectVersion.txt` 记录 `6000.3.27f1 (672d562a42a7)`
- `web`、`server`、`README.md`、`AI_LOG.md`、`.gitignore` 和 `.git` 在操作前均不存在
- Unity Editor 的 4 个匹配进程仍响应，未执行关闭操作

### React 初始化

使用的命令：

```powershell
npm create vite@latest web -- --template react-ts
```

首次在受限沙箱中执行时，npm registry 连接被操作系统拒绝，实际退出码为 `1`：

```text
npm error code EACCES
npm error syscall connect
npm error request to https://registry.npmmirror.com/create-vite failed
```

经批准的网络权限重试后：

```text
create-vite v9.3.3
Scaffolding project in D:\Ai-3D-Unity\web
VITE_CREATE_EXIT_CODE=0
```

使用的依赖安装命令：

```powershell
cd D:\Ai-3D-Unity\web
npm install
```

实际结果：

```text
added 28 packages in 48s
NPM_INSTALL_EXIT_CODE=0
```

使用 `npm ls --depth=0` 检查实际安装版本，退出码为 `0`：

```text
react@19.3.1
react-dom@19.3.1
typescript@7.0.2
vite@8.3.5
@vitejs/plugin-react@6.1.2
@types/node@24.19.2
@types/react@19.3.0
@types/react-dom@19.3.0
oxlint@1.90.0
```

生产构建命令：

```powershell
npm run build
```

实际结果：

```text
vite v8.3.5 building client environment for production...
✓ 20 modules transformed.
✓ built in 138ms
NPM_BUILD_EXIT_CODE=0
```

生成的 `dist` 仅来自 Vite 默认模板构建，未实现巡检业务页面。

### Go 初始化

执行的命令：

```powershell
New-Item -ItemType Directory -Path D:\Ai-3D-Unity\server
cd D:\Ai-3D-Unity\server
go mod init example.com/unity-inspect/server
```

实际结果：

```text
go: creating new go.mod: module example.com/unity-inspect/server
GO_VERSION=go version go1.27.0 windows/amd64
GO_MOD_INIT_EXIT_CODE=0
```

`go.mod` 当前内容为：

```text
module example.com/unity-inspect/server

go 1.27.0
```

未添加第三方依赖、Go 源文件、REST API 或业务逻辑。

### 文档和忽略规则

- 创建根目录 `README.md`
- 创建根目录 `AI_LOG.md`
- 创建根目录 `.gitignore`
- 保留 Vite 自带的 `web\README.md` 和 `web\.gitignore`

使用 `git check-ignore --no-index -v` 逐项验证忽略规则。以下路径全部被忽略：

- 两套 Unity 项目的 `Library`、`Temp`、`Obj`、`Logs`、`UserSettings`、`Build`、`Builds`
- `unity-smoke-test\.vscode`
- `web\node_modules`
- `web\dist`
- Go 的 `.exe`、`.test`、`.out` 和覆盖率产物示例
- `.env` 和 `web\.env.local`

以下必要路径未被忽略：

- `unity-smoke-test\Assets\Scenes\SampleScene.unity`
- `unity-smoke-test\Packages\manifest.json`
- `unity-smoke-test\Packages\packages-lock.json`
- `unity-smoke-test\ProjectSettings\ProjectVersion.txt`
- `unity-smoke-test\ProjectSettings\ProjectSettings.asset`
- `web\package.json`
- `web\package-lock.json`
- `server\go.mod`
- `.env.example`

其中 `.env.example` 的普通 `check-ignore -q` 返回退出码 `1`，确认未被排除规则忽略。

### Git 初始化

确认根目录没有 `.git` 后执行：

```powershell
git init -b main
```

实际结果：

```text
Initialized empty Git repository in D:/Ai-3D-Unity/.git/
GIT_INIT_EXIT_CODE=0
```

检查结果：

- 当前分支：`main`
- 远程仓库：未配置
- 提交：不存在，`HEAD` 验证返回退出码 `128`
- 未执行 commit、push、reset 或 clean

### 执行中的问题和待处理项

- 首次 Vite 下载因沙箱网络限制返回 `EACCES`，经批准联网后成功。
- 沙箱执行器在 Git 初始化后出现 `helper_unknown_error: setup refresh had errors`。
- 进一步检查发现 `.git` 所有者是沙箱账户，而当前用户是 `lin'zu'shu`，Git 因此报告 `dubious ownership`。
- 没有修改全局 Git 配置；只读 Git 验证使用了单次命令参数 `-c safe.directory=D:/Ai-3D-Unity`。该所有权问题需要项目经理审查。
- 旧 `unity` 目录仍是不完整工程，本次未移动、删除或清理。其 `ProjectSettings` 文件会出现在 Git 未跟踪状态中，后续提交前需要明确处理决定。
- 未运行浏览器端到端测试或 Go 测试，因为没有业务功能或测试入口。
- 未创建远程仓库，未提交或推送任何文件。

## 2026-10-28：INIT-003-REMEDIATION-002

### 目标与范围

- 防止根目录下不完整的旧 Unity 工程 `unity` 被误纳入版本控制。
- 保持有效工程 `unity-smoke-test` 的 Assets、Packages 和 ProjectSettings 可见。
- 诊断 Git `dubious ownership` 错误。
- 未修改所有权、ACL 或系统权限，未修改全局 Git 配置，未操作 Unity 目录或 Editor 进程。

### .gitignore 调整

修改前：

```text
SHA256=9DB592D5A7B8308A20E909B66819828BC5D641521245244E5FF059ED69E72F65
LineCount=59
```

新增内容：

```gitignore
# Retired incomplete Unity project at the repository root
/unity/
```

修改后：

```text
SHA256=BABEDC7FB6D86013EDCF8BF156DE5CBD0FAC7F4D1B63BEF3C9D74C1869029EB5
LineCount=62
```

原有忽略规则未删除。

### 忽略规则实际验证

使用命令：

```powershell
git -c safe.directory=D:/Ai-3D-Unity check-ignore --no-index -v -- <path>
```

实际结果：

| 路径 | 退出码 | 是否忽略 | 符合预期 |
|---|---:|---|---|
| `unity/ProjectSettings/ProjectVersion.txt` | 0 | 是 | 是 |
| `unity-smoke-test/Packages/manifest.json` | 1 | 否 | 是 |
| `unity-smoke-test/Packages/packages-lock.json` | 1 | 否 | 是 |
| `unity-smoke-test/ProjectSettings/ProjectVersion.txt` | 1 | 否 | 是 |

汇总结果：

```text
ALL_EXPECTATIONS_MET=True
```

随后执行：

```powershell
git -c safe.directory=D:/Ai-3D-Unity status --short --untracked-files=all
```

退出码为 `0`，结果：

```text
OldUnityStatusEntries=0
SmokeManifestEntries=2
SmokeProjectVersionEntries=1
```

旧 `unity` 目录已不再出现在 Git 未跟踪状态中；有效 Unity 工程的 manifest、lock 和版本文件仍可见。

### Git 所有权诊断

当前 Windows 用户：

```text
LAPTOP-UMJBHP78\lin'zu'shu
```

项目根目录所有者：

```text
LAPTOP-UMJBHP78\lin'zu'shu
```

`.git` 所有者：

```text
LAPTOP-UMJBHP78\CodexSandboxOffline
```

只读统计 `.git` 内共 26 个条目，全部属于 `CodexSandboxOffline`。根目录 ACL 中，当前用户和沙箱用户组均有继承的修改权限。

未使用单次 `safe.directory` 参数时：

```text
fatal: detected dubious ownership in repository at 'D:/Ai-3D-Unity'
ExitWithoutSafe=128
```

使用单次参数后：

```text
git -c safe.directory=D:/Ai-3D-Unity status --short --untracked-files=no
ExitWithSafe=0

git -c safe.directory=D:/Ai-3D-Unity branch --show-current
main
BranchExit=0

git -c safe.directory=D:/Ai-3D-Unity remote -v
RemoteExit=0
```

结论：Git 报错来自仓库安全目录检查；仓库元数据读取本身正常，分支仍为 `main`，远程仍为空。

只读检查全局配置时发现一条原有的、与本项目无关的 `safe.directory`。当前项目路径没有加入全局安全目录，本次未修改全局配置。

### 原因判断

`.git` 是此前在 Codex 沙箱中执行 `git init -b main` 时新建的，因此该目录及其 26 个元数据条目的所有者继承为 `CodexSandboxOffline`；项目根目录在初始化前已经存在，仍属于当前用户。根因是沙箱进程身份与当前 Windows 用户身份不同。

### 修复选项与风险

1. 最小影响方案：获得单独授权后，只将 `.git` 及其元数据的所有者修正为 `lin'zu'shu`，不调整项目源码、Unity 目录或系统级权限。风险最低，但属于所有权变更，本次严格禁止，未执行。
2. 临时方案：每条 Git 命令使用单次参数 `-c safe.directory=D:/Ai-3D-Unity`。不持久修改配置，但容易遗漏，只适用于诊断和短时操作。
3. 全局信任方案：将项目路径加入用户级全局 `safe.directory`。操作比较简单，但会持久修改用户全局 Git 配置，影响范围超过单仓库，本次未执行。
4. 重新创建 `.git`：当前没有 commit 和远程，重建仓库的数据损失较小，但仍会删除现有 `.git`，属于破坏性操作，本次未执行且不是首选。

### 本次未执行

- 未修改所有者、ACL 或系统权限
- 未修改全局 Git 配置
- 未 commit、push、reset 或 clean
- 未创建远程仓库
- 未移动、重命名或删除 Unity 目录
- 未关闭 Unity Editor
- 未编写业务代码
