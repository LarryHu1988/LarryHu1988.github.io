# LarryHu 个人网站（GitHub Pages + 阿里云域名）

这个仓库是 `larryhu.com` 的静态个人网站模板，已包含卡片式首页模块：
- 诗歌
- APP
- 摄影
- 写作
- 职业（半导体）
- 个人简历
- 联系方式

## 0. 先改成你的真实信息

编辑 `/Users/larry/Documents/LarryWebsite/index.html`：
- 邮箱、GitHub、LinkedIn、微信
- 诗歌标题、APP 名称、文章标题
- 职业经历和简历下载链接

## 1. 本地预览

```bash
cd /Users/larry/Documents/LarryWebsite
python3 -m http.server 8080
```

浏览器打开：`http://localhost:8080`

## 2. 推送到 GitHub

```bash
cd /Users/larry/Documents/LarryWebsite
git init
git add .
git commit -m "feat: personal website first version"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

推荐使用仓库名：`<你的GitHub用户名>.github.io`。

## 3. 打开 GitHub Pages

1. 进入仓库 `Settings`。
2. 打开 `Pages`。
3. 在 `Build and deployment` 中选择：
- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`
4. 保存后等待 1-3 分钟。

如果成功，会看到类似：`https://<username>.github.io`。

## 4. 绑定自定义域名 `larryhu.com`

1. 仍在 GitHub 仓库 `Settings -> Pages`。
2. `Custom domain` 填写：`larryhu.com`。
3. 保存后，GitHub 会在仓库里使用 `CNAME`（本项目已预置）。
4. 等待 DNS 生效后，勾选 `Enforce HTTPS`。

## 5. 阿里云 DNS 解析配置（重点）

进入阿里云控制台：`域名 -> larryhu.com -> 解析设置 -> 添加记录`。

添加以下记录：

1. `@` + `A` + `185.199.108.153`
2. `@` + `A` + `185.199.109.153`
3. `@` + `A` + `185.199.110.153`
4. `@` + `A` + `185.199.111.153`
5. `www` + `CNAME` + `<你的GitHub用户名>.github.io`

说明：
- 主机记录 `@` 代表根域名 `larryhu.com`
- 主机记录 `www` 代表 `www.larryhu.com`
- 记录类型在阿里云添加页选择 `A` 或 `CNAME`

## 6. 等待生效与验证

DNS 生效通常几分钟到几小时，最慢可到 24-48 小时。

可在本地验证：

```bash
dig larryhu.com +short
dig www.larryhu.com +short
```

预期：
- `larryhu.com` 返回 GitHub Pages 的 A 记录 IP
- `www.larryhu.com` 返回 `<username>.github.io` 的 CNAME 结果

## 7. GitHub Pages 官方与阿里云参考

- GitHub Pages 自定义域名与 DNS：
  https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- GitHub Pages 发布来源：
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- 阿里云云解析 DNS 添加记录说明：
  https://help.aliyun.com/zh/dns/add-a-dns-record
- 阿里云解析配置示例（主机记录 @ / www）：
  https://help.aliyun.com/zh/dns/configure-dns-resolution-for-a-domain-name

