# 本地 Markdown 阅读器

一个离线运行的 Windows Markdown 阅读器，复刻当前 MiNgHZ 网站阅读器的排版体验，并把字体、目录索引和渲染资源全部集成到本地。

## 下载与安装

在 [GitHub Releases](https://github.com/MiNgOfficial-HZ/local-markdown-reader/releases/latest) 下载 Windows x64 版本：

- [下载 Windows 安装版](https://github.com/MiNgOfficial-HZ/local-markdown-reader/releases/download/v0.1.0/MiNg.Markdown.Reader.Setup.0.1.0.exe)，运行后按提示安装，可创建桌面和开始菜单快捷方式。
- [下载 Windows 便携版](https://github.com/MiNgOfficial-HZ/local-markdown-reader/releases/download/v0.1.0/MiNg.Markdown.Reader.0.1.0.exe)，双击即可运行。

两种版本都已集成运行环境、Outfit、霞鹜文楷和 KaTeX，无需安装 Node.js 或额外下载字体。

## 字体

- 英文、数字和拉丁字符：`Outfit`
- 中文字符：`MiNg WenKai Chinese`（LXGW WenKai）

字体文件随应用打包，不依赖网络，也不会因为系统缺字而悄悄换成别的英文字体。

## 功能

- 打开单个 Markdown 文件或递归导入整个文件夹
- 目录索引：自动读取标题层级，点击目录跳转
- 支持 Markdown 表格、代码块、引用、图片、链接和 KaTeX 数学公式
- 拖拽文件打开、最近打开列表、文件所在位置
- 深色/浅色主题、字号调节、打印和导出 PDF
- 离线运行，资源和字体本地化

## 开发运行

```powershell
npm install
npm start
```

直接打开示例文档：

```powershell
npm start -- .\demo.md
```

## 构建 Windows 安装包

```powershell
npm run check
npm run dist
```

构建结果会写入 `dist/`，包括 NSIS 安装程序和 portable 便携版 EXE。

## 许可

本项目使用的 Outfit 和 LXGW WenKai 字体许可文件随字体目录一同保留；KaTeX 和 Markdown 渲染器的原始许可信息也保留在对应资源目录中。
