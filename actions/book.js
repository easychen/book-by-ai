import { gen, getPrompt, readData, writeData, extractJSON, outputDir } from '../lib/functions.js';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import pkg from 'enquirer';
const { prompt } = pkg;
const BOOK_LANG = process.env.BOOK_LANG || '中文';

class GenBook
{
    async main()
    {
        // 首先，我们需要一个描述，并根据此描述生成一个标题
        await this.title();
    }

    async title()
    {
        let bookData = readData();
        const info = await prompt({
            type: 'input',
            name: 'desp',
            message: '请输入描述',
            initial: '社交网络和人工智能正在成就个体崛起。尤其是对于掌握了编程能力和媒体运营能力的人群。',
        });

        const title = getPrompt('gen_title', {
            "detail": info.desp,
            "language": BOOK_LANG,
        });
        const result = await gen(title);
        if( result.json.title )
        {
            console.log(``);
            const info2 = await prompt({
                type: 'input',
                name: 'title',
                message: `请确认书名`,
                initial: result.json.title,
            });

            if( info2.title === '' )
            {
                info2.title = result.json.title;
            }
            
            bookData.title = info2.title;
            bookData.desp = info.desp;
            bookData.coverDetail = result.json.cover_detail;
            writeData(bookData);
            console.log(`书名 《${bookData.title}》`);
        }else
        {
            console.log('书名生成失败');
        }

    }

    async index()
    {
        // 创建目录
        let bookData = readData();
        const info = await prompt([
            {
                type: 'input',
                name: 'chapter_min',
                message: '请输入最少章数',
                initial: '5',
            },
            {
                type: 'input',
                name: 'chapter_important',
                message: '请输入重点章数',
                initial: '3',
            },
            {
                type: 'input',
                name: 'section_important_min',
                message: '请输入重点章的小节数',
                initial: '3',
            },
            {
                type: 'input',
                name: 'section_min',
                message: '请输入普通章的小节数',
                initial: '2',
            },
        ]);
        bookData.chapterPref = info;
        console.log("请稍候，正在发起请求…");
        const text = getPrompt('gen_index', { ...bookData, ...info, "language": BOOK_LANG });
        const result = await gen(text);
        console.log("result", result);
        if( result.json.index )
        {
            console.log(result.json.index);
            bookData.index = result.json.index;
            writeData(bookData);
        }
    }

    // 根据chapter生成章节
    async sections()
    {
        const bookData = readData();
        const chapters = bookData.index.chapters;
        if( !chapters )
        {
            console.log("请先生成目录");
            return;
        }
        const chapterTitles = chapters.map( (item, index) => {
            return `${index+1}. ${item.title}`;
        }).join(" , ");
        // 开始循环章节
        for( let i = 0; i < chapters.length; i++ )
        {
            // 检查是否已经生成了小节
            if( chapters[i].sections )
            {
                // 跳过
                continue;
            }else
            {
                // 确认本章的写作思路
                const info = await prompt({
                    type: 'input',
                    name: 'howTo',
                    message: `请确认本章《${chapters[i].title}》的写作思路`,
                    initial: chapters[i].howTo,
                });
                
                
                const bookInfo = { 
                    title: bookData.title,
                    desp: bookData.desp,
                    chapter_title: chapters[i].title,
                    chapter_howto: info.howTo ||chapters[i].howTo,
                    chapter_is_important: chapters[i].important?"是":"不是",
                    chapter_titles: chapterTitles,
                    language: BOOK_LANG,
                }

                const text = getPrompt('gen_sections', { ...bookInfo, ...bookData.chapterPref||{} });
                // console.log(text);
                console.log("请稍候，正在发起请求…");
                const result = await gen(text);
                // console.log("result", result.json);
                if( result.json.sections )
                {
                    chapters[i].sections = result.json.sections;
                    writeData(bookData);
                }  

                
                // 测试一个就够了
                // break;

            }

            // 休息2秒
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, 2000);
            }
            );
        }
    }

    // 编写小节内容
    async write()
    {
        const bookData = readData();
        const chapters = bookData.index.chapters;
        if( !chapters )
        {
            console.log("请先生成目录");
            return;
        }
        // 循环章，再循环节
        for( let i = 0; i < chapters.length; i++ )
        {
            const sections = chapters[i].sections;
            if( !sections )
            {
                console.log("请先生成小节");
                continue
            }
            for( let j = 0; j < sections.length; j++ )
            {
                if( sections[j].content )
                {
                    // 跳过
                    continue;
                }else
                {
                    const bookInfo = { 
                        title: bookData.title,
                        desp: bookData.desp,
                        toc: this.buildToc(),
                        chapter_title: chapters[i].title,
                        chapter_howto: chapters[i].howTo,
                        chapter_is_important: chapters[i].important?"是":"不是",
                        section_title: sections[j].title,
                        section_is_important: sections[j].important?"是":"不是",
                        language: BOOK_LANG,
                    }
    
                    const text = getPrompt('gen_content', { ...bookInfo, ...bookData.chapterPref||{} });
                    console.log(text);
                    
                    console.log("请稍候，正在发起请求…");
                    const result = await gen(text,  ( message, char ) => process.stdout.write(char), 'bba-content');
                    // console.log("result", result.json);
                    if( result.json['bba-content'] )
                    {
                        sections[j].content = result.json['bba-content'];
                        writeData(bookData);
                    }
    
                    
                    // 测试一个就够了
                    // break;
    
                }
    
                // 休息2秒
                console.log("5秒后开始撰写下一小节，按 Ctrl+C 可以中断程序");
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, 5000);
                }
                );
            }

            // break;
        }
    }

    buildToc()
    {
        // 循环章节，生成 Table of Content
        const bookData = readData();
        // console.log(bookData);
        const chapters = bookData.index.chapters;
        let toc = ``; // TOC 是 markdown 格式的字符串
        for( let i = 0; i < chapters.length; i++ )
        {
            const sections = chapters[i].sections;
            if( !sections )
            {
                continue
            }
            toc += `## ${chapters[i].title}\n`;
            for( let j = 0; j < sections.length; j++ )
            {
                toc += `### ${sections[j].title}\n`;
            }
        }
        // console.log(toc);
        return toc;
    }

    test()
    {
        const text = `
2. 我注意到本小节不是重点小节,将控制在1000字以内。

3. 内容如下:
3. 撰写的内容如下:

    {   
      "content": "## 社交媒体运营的兴起

过去十年,社交媒体的迅猛发展为内容创作者提供了前所未有的曝光机会。随着互联网和移动网络的普及,普通大众获取信息和娱乐的渠道也从传统媒体向社交平台转移。越来越多优秀的创作者开始利用微博、B站、抖音等新兴社交平台进行传播,并凭借这些社交媒体积累大量粉丝。        

这其中最典型的例子非微博莫属。2006年微博诞生后,很快就成为中国网民获取新闻和表达观点的主要平台。明星大V、网红、自媒体人等在微博上的每一条发言,都能产生海量转发和讨论。相比传统媒体仅仅是单向输出内容,微博平台让每一个普通用户都可以参与讨论并产生影响力。一时间,\"头条都是大V的微博\"成为这个时代的标志。       

视频类社交平台抖音和B站的繁荣,也让 \"草根\" 创作者有了更多被发现和走红的机会。这两家平台都具有强大的推荐算法,能够挖掘出优秀的创作内容。许多原本默默无闻的创作者,在这些平台上积累人气后成功出圈,并在此基础上获得商业价值的转化。从这个角度看,平台与内容创作者可谓你中有我、我中有你,实现了共赢。      

综上所述,社交媒体的兴起为个人的内容创作提供了空前的舞台。只要你有创作激情和优质内容,就很有可能通过新兴的社交平台积累影响力、吸引粉丝、实现商业价值。如何在这个时代抓住机遇,本书将为你逐一解析。"
    }

请您检查并提出修改意见,我会继续完善。非常感谢您的指导
        `;
        const ret = extractJSON(text);
        console.log(ret);
    }

    async make()
    {
        const bookData = readData();
        // 在 book 目录下初始化 mdbook 项目
        const bookDir = path.join( outputDir, bookData.title);
        // 确保目录存在
        if( !fs.existsSync(bookDir) )
        {
            fs.mkdirSync(bookDir);
        }
        // 初始化 mdbook 项目
        const initCmd = `cd ${bookDir} && mdbook init --ignore git --title "${bookData.title}" --force`;
        // 运行命令，并输出结果
        // console.log(initCmd);
        console.log("正在初始化 mdbook 项目…");
        await new Promise((resolve, reject) => {
            exec(initCmd, (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                console.log(stdout);
                resolve();
            });
        }
        );

        const summaryPath = path.join(bookDir, 'src/SUMMARY.md');
        
        // 循环章节，生成 mdbook 的 SUMMARY.md 
        let summary = `# Summary\n\n`;
        const chapters = bookData.index.chapters;
        for( let i = 0; i < chapters.length; i++ )
        {
            const chapterDir = path.join(bookDir, 'src',  chapters[i].title);
            // 确保目录存在
            if( !fs.existsSync(chapterDir) )
            {
                fs.mkdirSync(chapterDir);
            }

            // 创建章节的 README.md
            const chapterReadmePath = path.join(chapterDir, 'README.md');
            const chapterReadme = `# ${chapters[i].title}\n\n${chapters[i].desp||chapters[i].howTo||""}\n\n`;
            fs.writeFileSync(chapterReadmePath, chapterReadme);
            
            const sections = chapters[i].sections;
            if( !sections )
            {
                continue
            }
            summary += `* [${chapters[i].title}](${chapters[i].title}/README.md)\n`;
            for( let j = 0; j < sections.length; j++ )
            {
                summary += `    * [${sections[j].title}](${chapters[i].title}/${sections[j].title}.md)\n`;
                // 将 section 的内容写入文件
                const sectionPath = path.join(chapterDir, `${sections[j].title}.md`);
                // console.log("sectionPath", sectionPath, sections[j]);
                const sectionContent = String(sections[j].content.trim()).startsWith(`# ${sections[j].title}`) ? sections[j].content : `# ${sections[j].title}\n\n${sections[j].content}`;
                fs.writeFileSync(sectionPath, sectionContent);
                
            }
        }
        // console.log(summary);
        fs.writeFileSync(summaryPath, summary);
        console.log("summary 生成");
    }
}

export default new GenBook();