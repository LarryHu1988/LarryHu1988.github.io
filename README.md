# 滴水龙雨工作室 · Larry Studio

Lawrence Hu 的个人网站。[larryhu.com](https://larryhu.com)

生于滴水沿，现居滴水湖。生肖属龙，生时逢雨。
半导体行业从业十二年，从产品工程到工艺整合。
追梅西，忠巴萨，念科比。看读库，读新诗，写小诗。踢实况，打黑猴，码 APP。

## 网站内容

- 个人简介：保留中英文原文，支持简繁切换。
- 数码雨饭：SimpleWorth、KeepFit、PDF Librarian 三个独立作品。
- 诗情雨意：《二姥爷是个哑巴》《表演》，每首诗有独立阅读地址，保留全文、分行与写作时间。

## 开发与发布

使用 Next.js App Router、React、TypeScript 和 Tailwind CSS。静态导出后由 GitHub Pages 发布，不需要常驻 Node 服务。

```sh
npm ci
npm run dev
```

构建和验证：

```sh
npm run build
npm run typecheck
npm test
npm run preview
```

浏览器测试使用本机 Google Chrome，检查手机与桌面布局、诗歌全文、简繁切换、旧产品链接和 WCAG AA 可访问性。

`main` 保存源代码，`gh-pages` 保存生成的网站。首次配置 GitHub Pages 发布源为 `gh-pages:/`，后续运行：

```sh
npm run deploy
```

发布脚本在临时目录里创建部署分支的独立副本，并正常提交和推送，不改动源代码工作区，也不强推。域名文件与 `.nojekyll` 会自动带入发布产物。

## 内容维护

- 首页与布局：`components/home.tsx`、`app/globals.css`。
- App 名称、介绍、主页和下载链接：`content/apps.ts`。
- 诗歌全文：`content/poems.json`。新增诗歌会自动生成阅读页和网站地图。
- 字标使用 Cormorant SC 的原生小型大写字形，正文使用 DM Sans 与 Noto Serif SC 子集，均由本站托管；许可位于 `public/fonts/`。如新增的汉字不在子集中，会使用系统宋体后备字体。

## App 主页

| App | 主页 | 下载 | 帮助 |
| --- | --- | --- | --- |
| SimpleWorth · 简值 | [/simpleworth/](https://larryhu.com/simpleworth/) | [App Store](https://apps.apple.com/app/id6761478113) | [技术支持](https://larryhu.com/simpleworth/support/) · [隐私政策](https://larryhu.com/simpleworth/privacy/) |
| KeepFit | [/keepfit/](https://larryhu.com/keepfit/) | [App Store](https://apps.apple.com/app/id6759662867) | [技术支持](https://larryhu.com/keepfit/support/) · [隐私政策](https://larryhu.com/keepfit/privacy/) |
| PDF Librarian | [/PDFLibrarian/](https://larryhu.com/PDFLibrarian/) | [App Store](https://apps.apple.com/us/app/pdf-librarian/id6760351540?mt=12) | [技术支持](https://larryhu.com/PDFLibrarian/support/) · [隐私政策](https://larryhu.com/PDFLibrarian/privacy-policy/) |

SimpleWorth 和 KeepFit 的既有静态页面在构建时复制到发布目录，保留其主页、支持、隐私和所有资源。直接编辑根目录下的 `simpleworth/` 与 `keepfit/`，不要编辑自动生成的 `public/simpleworth/` 与 `public/keepfit/`。

PDF Librarian 保留独立仓库 `LarryHu1988/PDFLibrarian` 的 `main:/docs` Pages 发布源，继续使用原来的大写路径。其主页、支持与隐私页在该仓库维护。本站只保留用于作品预览的真实图标和截图。

没有分析或广告脚本。应用截图为演示数据。
