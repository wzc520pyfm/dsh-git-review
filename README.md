# 审查

把 Codex 应用右侧栏里的 **审查** 装进 DeepSeek Harness（DSH）自己的右侧栏。

打开会话后，在侧栏的添加菜单里选择「审查」，或点会话标题旁的「审查」。面板反映的是 Git 仓库的状态，不限于这一轮助手改过的文件。

## 能做什么

- 范围：未暂存、已暂存、某一次提交、相对基础分支、上轮对话
- 统一差异 / 拆分差异、自动换行、隐藏空白、文字差异、加载完整文件
- 暂存、取消暂存、还原，作用到全部、单个文件或单个代码块；还原前会确认
- 分支范围可以把文件标成已查看
- 悬停一行，点 `+` 留下行内评论，再让当前会话处理这些评论
- 「代码审查」会按 Codex 的 `/review` 范围起草只读审查请求
- 提交、推送，以及在安装了 `gh` 时创建拉取请求

`/review`、`/review uncommitted`、`/review branch main`、`/review commit <sha>` 和 `/review 你的要求` 走 DSH 的命令面。审查请求要求模型只读，并用 `:::review` 块把发现贴回对应行。

## 安装

需要 DSH `0.1.5` 或更新（自带右侧栏），以及 Node.js 22.19+。

```bash
dsh plugin --profile web add file:/path/to/dsh-codex-review
```

`cordis.patch.yml` 会把插件写进 profile。装完后重启 DSH。客户端改动刷新页面即可，宿主改动需要重启。

卸掉：

```bash
dsh plugin --profile web remove dsh-codex-review
```

## 本地看面板

仓库自带一个和插件共用同一套面板的预览。它会在临时目录准备一个带暂存、未暂存和未跟踪文件的演示仓库。

```bash
npm install
npm test
npm run dev
```

预览地址是 [http://127.0.0.1:43127](http://127.0.0.1:43127)。

```bash
npm run build
```

会生成 `lib/index.js`（宿主）和 `lib/client.js`（浏览器）。浏览器包通过 `window.__ModuleLoader__` 注册，React 由 DSH 提供。
