# 本地 Markdown 阅读器

这是一个用于验证阅读排版的本地文档。中文正文使用网站同款的 **霞鹜文楷**，英文正文使用网站同款的 *Outfit*。

## 目录索引

打开包含多个标题的 Markdown 文件后，左侧会显示目录索引。点击标题可以平滑跳转到对应段落。

### Typography

The reader keeps the same typography as the website: Chinese glyphs use LXGW WenKai and Latin glyphs use Outfit.

## 阅读体验

- 支持本地 Markdown 文件和文件夹导入
- 支持明暗主题、字号调节与打印 / PDF
- 支持表格、引用、代码、图片和 LaTeX 公式

> 这是一个离线阅读器，打开文件后不需要联网。

| 功能 | 状态 |
| --- | --- |
| Markdown 渲染 | 已完成 |
| 目录索引 | 已完成 |
| 字体内置 | 已完成 |

```js
const font = 'Outfit';
console.log(font);
```

$$
E = mc^2
$$
