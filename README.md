Here is the English translation:

# Book By AI

> Use AI to generate high-quality ebooks

[简体中文](README.cn.md) | [English](README.md) 

[![](images/20230811203616.png)](https://github.com/easychen/book-by-ai/assets/1294760/e2b6e7f9-1be1-4321-b71f-3207cb202909)

## AUTOMATIC BOOK GENERATION DEMO

1. Manually input text: numbers within ten 
2. Total generation time: about 2 hours
3. Cost: Around $0.6  (cost for generating 30 images)
4. Online reading: [English Book](https://demo02.level06.com/) | [中文样书](https://demo01.level06.com/)

## Video Tutorial

> in Chinese

[Youtube](https://www.youtube.com/watch?v=iMUg8ccIeZg) | [Bilibili](https://www.bilibili.com/video/BV1Ku4y1q75F)

## Prerequisites

1. git
2. nodejs
3. terminal
4. [mdbook](https://rust-lang.github.io/mdBook/guide/installation.html) installed

## How to Use

1. Get [OpenAI](https://platform.openai.com/) API key or deploy your own [AiAPI](https://github.com/easychen/aiapi) 
2. git clone https://github.com/easychen/book-by-ai.git BBA
3. cd BBA
4. npm install
5. cp .env.example .env
6. Configure .env according to comments
7. node bba.js book // Run full process from scratch 
8. Follow prompts to input content
10. cd output/<book name>/ && mdbook serve // Preview locally
11. cd output/<book name>/ && mdbook build // Generate html

## Command Description

1. node bba.js book@help // Show help
2. node bba.js book@title // Generate title 
3. node bba.js book@index // Generate table of contents (chapters)
4. node bba.js book@sections // Generate table of contents (sections)
5. node bba.js book@write // Write section content
6. node bba.js book@make // Generate mdbook project
7. node bba.js book@addImage // Generate cover and section images
8. node bba.js book@update // Rewrite a section
9. node bba.js book@translate // Translate sections 