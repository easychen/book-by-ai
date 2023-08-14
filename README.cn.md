# Book By AI ( AKA B.B.A )

Generate high-quality books with AI

> 用AI生成高质量电子书

[简体中文](README.cn.md) | [English](README.md) 

[![](images/20230811203616.png)](https://github.com/easychen/book-by-ai/assets/1294760/e2b6e7f9-1be1-4321-b71f-3207cb202909)

## 自动生成书籍DEMO

1. 人工输入文字：十个以内
1. 生成时间：累计2小时
1. 花费成本：3元左右（30张图片的生成费用）
1. 在线阅读：[中文样书](https://demo01.level06.com/) | [English Book](https://demo02.level06.com/) 

## 视频教程

![](images/20230812032456.png)

[Youtube](https://www.youtube.com/watch?v=iMUg8ccIeZg) | [B站](https://www.bilibili.com/video/BV1Ku4y1q75F)


## 前置要求

1. git
1. nodejs
1. 终端
1. 安装 [mdbook](https://rust-lang.github.io/mdBook/guide/installation.html) 命令行

## 如何使用 

1. 开通[API2d](https://api2d.com/r/186008) 或者 自建 [AiAPI](https://github.com/easychen/aiapi) 接口
1. git clone https://github.com/easychen/book-by-ai.git BBA
1. cd BBA
1. npm install
1. cp .env.cn.example .env
1. 根据注释配置 .env
1. node bba.js book_cn // 从头开始运行全部流程
1. 按提示输入内容即可。如果中途遇到中断，可以重新运行命令。
1. cd output/**&lt;book name&gt;**/ && mdbook serve // 本地预览
1. cd output/**&lt;book name&gt;**/ && mdbook build // 生成 html


## 命令说明
1. node bba.js book_cn@help // 显示帮助
1. node bba.js book_cn@title // 生成标题
1. node bba.js book_cn@index // 生成目录（章）
1. node bba.js book_cn@sections // 生成目录（节）
1. node bba.js book_cn@write // 编写小节内容
1. node bba.js book_cn@make // 生成 mdbook 项目
1. node bba.js book_cn@addImage // 封面和章节配图生成
8. node bba.js book_cn@update // 重写某一节
9. node bba.js book_cn@translate // 翻译全部小节


