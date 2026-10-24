# 静态部署

本项目没有构建步骤和应用后端。先运行测试，再用 `python3 scripts/package_site.py` 生成 `build/resume-studio.zip`。包只含运行文件，入口在根目录。

## Cloudflare Pages

1. 在自己的 Cloudflare 账号中进入 Workers & Pages，建立 Pages 直接上传项目。
2. 上传 ZIP，或解压后上传目录；部署完成后回读项目的生产 URL。
3. 用未登录窗口检查首页、静态资源和实际编辑／导出。本地检查、HTTP 200 与线上交互验证是不同证据。

也可以用已授权的官方 Wrangler CLI，`<...>` 必须替换为用户自己的值：

```bash
wrangler login
wrangler pages deploy build/site --project-name <your-project> --branch main
```

`package_site.py` 同时生成 `build/site/`。不要上传整个 Git 仓库、个人副本、测试输出、`.env` 或浏览器备份。CLI 认证由使用者自己的环境管理，仓库不包含令牌或账号配置。发布未知时先回读原部署，不重复创建项目。

新网址是不同的浏览器 origin。旧站内容需要先导出 JSON，在新站导入；域名切换不会自动迁移 localStorage。

`pages.dev` 无需自购域名；中国大陆访问应在实际网络实测。若用户要其他平台，上传相同静态目录即可，不需要引入服务器或数据库。

官方参考：[直接上传](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Wrangler Pages 命令](https://developers.cloudflare.com/workers/wrangler/commands/#pages)。
