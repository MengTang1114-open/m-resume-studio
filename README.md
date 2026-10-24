# m-resume-studio · 简历工坊

一个可安装的双语简历 Skill，以及像 Word 一样直接编辑的纯前端简历网站。

**[在线使用](https://resume-studio-blh.pages.dev/)** · [Skill 使用合同](SKILL.md) · [部署说明](references/deploy.md) · [来源说明](THIRD_PARTY_NOTICES.md)

## 能做什么

- 在纸面上直接改字，右侧实时预览；也可切到 Markdown。
- 勾选教育、项目、实习、工作、学生工作、技能及爱好。新模板每类经历默认三条，工作经历默认隐藏。
- 用按钮新增、复制、删除整条经历、调整条目和栏目顺序；支持结构操作撤销、重做。
- 中文、英文独立保存；英文基本信息标签与占位文字在本地转换，真实姓名、电话和邮箱保留。
- 可选二寸照片版式，照片框 35 × 49 mm；支持有／无照片切换和上下裁切位置。
- 三种排版预设、深浅主题、字号、行距、页边距和强调色。
- 导出 Markdown、离线 HTML、双语 JSON 备份，以及浏览器打印 PDF。
- Skill 帮助整理真实经历、撰写中英文简历，并把结果导入自己的编辑器副本。

当前使用按钮排序，不提供经历拖拽。正文文字使用浏览器原生撤销，工具栏撤销用于整段结构操作。

## 安装 Skill

支持 Skills CLI 的 Agent 可以安装：

```bash
npx skills add MengTang1114-open/m-resume-studio
```

也可以下载仓库，将包含 `SKILL.md`、`scripts/`、`references/`、`web/` 的完整目录放到宿主支持的 Skill 位置。具体安装位置由宿主管理，不需要 API Key。

使用示例：

> 使用 m-resume-studio，按我提供的经历和目标岗位整理一份中英文简历。不要编造数字，缺失信息先问我。给我可编辑的 Markdown，并建立一份本地编辑器副本。

这不会自动安装、更新或覆盖其他简历 Skill。

## 只运行网站

需要 Python 3。网站本身没有构建过程、应用后端或数据库。

```bash
git clone https://github.com/MengTang1114-open/m-resume-studio.git
cd m-resume-studio
python3 -m http.server 4178 --bind 127.0.0.1 --directory web
```

打开 **http://127.0.0.1:4178/**。保持服务器运行即可编辑。网站使用 ES modules，请通过 HTTP 打开，不要双击 HTML 文件。

## 建立自己的简历副本

共享安装目录只保留匿名模板。用脚本复制网站到仓库外的个人工作目录；已有目录会被拒绝，避免覆盖文件。

```bash
python3 scripts/create_workspace.py ../my-resume
```

已有 Markdown 时可选：

```bash
python3 scripts/create_workspace.py ../my-resume --zh /path/to/resume.zh.md --en /path/to/resume.en.md
python3 -m http.server 4178 --bind 127.0.0.1 --directory ../my-resume
```

也可直接使用网页的「导入 Markdown／JSON」按钮。若浏览器已有草稿，导入后保存；改源模板不会自动覆盖 localStorage。

## 隐私与翻译

简历、照片、设置及历史保存在当前浏览器的 localStorage；网站没有保存这些数据的后端，也没有分析或跟踪脚本。换设备、浏览器、域名或端口后不会自动迁移，请先导出 JSON 备份。

切换 EN 只切换稿件。点击「生成英文草稿」并确认后，网站才会把中文正文片段发给 **MyMemory** 公共翻译 API。姓名、顶部个人信息及识别出的联系方式行留在本地；正文中额外出现的个人信息仍需自行检查。英文稿覆盖前确认并备份；失败或取消不会写入半份译文。机器译文须人工核对专名、数字和事实。

Skill 在你的 Agent 内撰写双语内容，不需要调用 MyMemory。Agent 自身的数据处理遵循所用宿主的设置。

打印 PDF 时，取消浏览器打印窗口中的「页眉和页脚」，可以去掉日期、标题、网址和页码。

## 开发与检查

需要 Node.js 18+、Python 3.9+，无需安装 npm 依赖。

```bash
npm test
npm run check
python3 scripts/package_site.py
```

`build/resume-studio.zip` 是可直接上传的静态包，入口 `index.html` 在 ZIP 根目录；测试、个人草稿和宿主配置不会进入包。

## 部署

任何支持静态文件的服务都可托管 `web/` 的运行文件。Cloudflare Pages 的直接上传方式见 [部署说明](references/deploy.md)。仓库不包含维护者账号 ID、令牌或原站部署配置，也不在 CI 自动发布。

默认 `pages.dev` 网址的中国大陆连通性需要在实际使用的网络测试，本项目不保证所有地区稳定访问。

## 来源与许可

本项目从 RedSkill `kafkaskill004@1.0.1`（Rescume）配套简历工具的使用体验发展而来，保留来源说明；网站经过本项目的功能扩展与维护。这里的 `SKILL.md` 是为当前网站重新编写的入口，未打包分发原版 Rescume Skill、原版工具目录或其下载包。

本项目新增代码和文档采用 [MIT](LICENSE)。该声明不替上游原包授予许可；上游未附许可证的范围见 [第三方说明](THIRD_PARTY_NOTICES.md)。
