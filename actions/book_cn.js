import { gen, getPrompt, readData, writeData, extractJSON, outputDir, genImage, baseDir, search, fetch_url2, convertToDirectoryPath } from '../lib/functions_cn.js';
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
        await this.title(); // 生成标题
        await this.index(); // 生成目录（章）
        await this.sections(); // 生成目录（节）
        await this.write(); // 编写小节内容
        await this.make(); // 生成 mdbook 项目
        await this.addImage(); // 封面和章节配图生成
    }

    async help()
    {
        // 根据main调用的顺序，生成帮助信息
        console.log(``);
        console.log(`@title - 生成书名`);
        console.log(`@index - 生成目录（章）`);
        console.log(`@sections - 生成目录（节）`);
        console.log(`@write - 编写小节内容`);
        console.log(`@make - 生成 mdbook 项目`);
        console.log(`@addImage - 封面和章节配图生成`);
        console.log(``);
        
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

                    let ref = "";
                    // 搜索网页获取资料
                    if( process.env.SEARCH_DOMAIN && sections[j].queries && sections[j].queries.length > 0 )
                    {
                        console.log("请稍候，正在发起搜索请求…");
                        const sites = process.env.SEARCH_DOMAIN == '*' ? false : process.env.SEARCH_DOMAIN.split("|");
                        const results = await search( 
                            sections[j].queries.join(" "), 
                            sites, 
                            false, // headless
                            true // extend link
                        );
                        // console.log(results);
                        if( results && results.length > 0 )
                        {
                            ref = JSON.stringify(results);
                        }
                    }else
                    {
                        console.log(process.env.SEARCH_DOMAIN, sections[j].queries);
                    }
                    
                    // 一万字符作为参考
                    // ref = ref.substring(0, 12000);

                    const text = getPrompt('gen_content', { ...bookInfo, ...bookData.chapterPref||{}, ref });
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
                console.log(`已撰写 ${i+1}/${chapters.length} 章，${j+1}/${sections.length} 节`);
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

        console.log("全部小节内容撰写完成");
    }

    async addImage()
    {
        const bookData = readData();
        const bookDir = path.join( outputDir, convertToDirectoryPath(bookData.title));
        const imageDir = path.join( bookDir, 'src', 'images');
        // 确保目录存在
        if( !fs.existsSync(imageDir) )
        {
            fs.mkdirSync(imageDir, { recursive: true });
        }
        // 读取封面数据
        if( bookData.coverDetail && !bookData.coverUrls )
        {
            console.log(`开始生成封面图片${bookData.coverDetail}，请稍候…`);
            // 生成封面图片
            const covers = await genImage(bookData.coverDetail);
            if( covers.artifacts )
            {
                // 循环artifacts，将 base64 的图片保存到 imageDir 下
                for( let i = 0; i < covers.artifacts.length; i++ )
                {
                    const item = covers.artifacts[i];
                    if(item.base64)
                    {
                        const filename = path.join(imageDir, `cover.${i}.png`);
                        // 保存base64数据到文件
                        const buffer = Buffer.from(item.base64, 'base64');
                        fs.writeFileSync(filename, buffer);

                        bookData.coverUrls = bookData.coverUrls || [];
                        bookData.coverUrls.push(`cover.${i}.png`);

                        writeData(bookData);
                    } 
                }
            }
        }

        // 循环章节，再循环节
        if( !bookData.index?.chapters ) return false;
        const chapters = bookData.index.chapters;
        for( let i = 0; i < chapters.length; i++ )
        {
            for( let j = 0; j < chapters[i].sections.length; j++ )
            {
                const section = chapters[i].sections[j];
                if( section.cover_detail )
                {
                    // 生成图片
                    console.log(`开始生成图片${section.cover_detail}，请稍候…`);
                    const images = await genImage(section.cover_detail);
                    if( images.artifacts )
                    {
                        // 循环artifacts，将 base64 的图片保存到 imageDir 下
                        for( let k = 0; k < images.artifacts.length; k++ )
                        {
                            const item = images.artifacts[k];
                            if(item.base64)
                            {
                                const filename = path.join(imageDir, `chapter.${i+1}.section.${j+1}.image.${k+1}.png`);
                                // 保存base64数据到文件
                                const buffer = Buffer.from(item.base64, 'base64');
                                fs.writeFileSync(filename, buffer);

                                section.images = section.images || [];
                                section.images.push(`chapter.${i+1}.section.${j+1}.image.${k+1}.png`);

                                writeData(bookData);
                            } 
                        }
                    }
                }

                // 休息5秒
                console.log("5秒后开始生成下一张图片，按 Ctrl+C 可以中断程序");
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, 5000);
                });
            }
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

    async test()
    {
        // console.log("正在生成图片，请耐心等候…");
        // const ret = await genImage("A young woman using data analytics software and charts on multiple monitors to uncover insights and showing excitement as profits rapidly increase.");
        // console.log(ret);
        // const ret = await search( '粉丝数 关注度 社交平台', ['wikipedia.org'], false, true );
        // console.log(ret);
        // const ret = await fetch_url2("https://www.xdsyzzs.com/shangyeliutong/7031.html");
        // console.log(ret);
        const bookData = readData();
        console.log(  convertToDirectoryPath(bookData.title) );
    }

    async make()
    {
        const bookData = readData();
        // 在 book 目录下初始化 mdbook 项目
        const bookDir = path.join( outputDir, convertToDirectoryPath(bookData.title));
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
        let summary = `# Summary\n\n* [封面](README.md)\n`;
        // 生成首页
        const frontPath = path.join(bookDir, 'src/README.md');
        let frontContent = `# ${bookData.title}\n\n`;
        // 如果存在封面图片，则添加图片
        if( bookData.coverUrls )
        {
            frontContent += `![封面](/images/${bookData.coverUrls[0]})\n\n`;
        }
        fs.writeFileSync(frontPath, frontContent);

        const chapters = bookData.index.chapters;
        for( let i = 0; i < chapters.length; i++ )
        {
            const chapterDir = path.join(bookDir, 'src',  convertToDirectoryPath(chapters[i].title));
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
            summary += `* [${chapters[i].title}](${convertToDirectoryPath(chapters[i].title)}/README.md)\n`;
            for( let j = 0; j < sections.length; j++ )
            {
                summary += `    * [${sections[j].title}](${convertToDirectoryPath(chapters[i].title)}/${convertToDirectoryPath(sections[j].title)}.md)\n`;
                // 将 section 的内容写入文件
                const sectionPath = path.join(chapterDir, `${convertToDirectoryPath(sections[j].title)}.md`);
                // console.log("sectionPath", sectionPath, sections[j]);

                const sectionCoverMarkdown = sections[j].images ? sections[j].images.map((url) => `![${sections[j].title}](/images/${url})`).join("\n\n")+`\n\n` : "";

                const sectionContent = String(sections[j].content.trim()).startsWith(`# ${sections[j].title}`) ? sections[j].content : `# ${sections[j].title}\n\n${sections[j].content}`;

                fs.writeFileSync(sectionPath, sectionCoverMarkdown+''+sectionContent);
                
            }
        }
        // console.log(summary);
        fs.writeFileSync(summaryPath, summary);
        console.log("summary 生成");
    }

    async update()
    {
        // 修改小节内容
        // 输入小节标题
        const bookData = readData();
        const section_title = await prompt({
            type: 'input',
            name: 'section_title',
            message: '请输入小节标题'
        });
        // 搜索 bookData 定位小节
        const chapters = bookData.index.chapters;
        let section = null;
        let chapter = null;
        for( let i = 0; i < chapters.length; i++ )
        {
            const sections = chapters[i].sections;
            if( !sections )
            {
                continue
            }
            for( let j = 0; j < sections.length; j++ )
            {
                if( sections[j].title == section_title.section_title )
                {
                    section = sections[j];
                    chapter = chapters[i];
                    break;
                }
            }
        }
        if( !section )
        {
            console.log("没有找到小节");
            return;
        }
        // 输入修改意见
        const info = await prompt({
            type: 'input',
            name: 'howToFix',
            message: `请提供本节《${section.title}》的修改意见`,
        });
        // 生成修改意见
        const bookInfo = {
            title: bookData.title,
            desp: bookData.desp,
            toc: this.buildToc(),
            chapter_title: chapter.title,
            chapter_is_important: chapter.important?"是":"不是",

            section_title: section.title,
            section_is_important: section.important?"是":"不是",
            section_content: section.content,
            language: BOOK_LANG,
        };
        const text = getPrompt('gen_update', { ...bookInfo, ...bookData.chapterPref||{}, howto_fix: info.howToFix });

        const updated_content = await gen(text,  ( message, char ) => process.stdout.write(char), 'bba-content');

        // 是否确认更新到小节
        const confirm = await prompt({
            type: 'confirm',
            name: 'confirm',
            message: `是否确认更新到小节《${section.title}》？`,
            initial: true,
        });
        if( confirm.confirm )
        {
            section.content = updated_content.json['bba-content'];
            writeData(bookData);
            console.log(`小节《${section.title}》更新成功`);
        }
    }

    async translate()
    {
        // 输入要翻译的语言
        const info = await prompt({
            type: 'input',
            name: 'language',
            message: `请输入要翻译的语言`,
            initial: 'english',
        });
        
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
                if( !sections[j].content || sections[j].language == info.language )
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
                        to_language: info.language,
                    }

                    
                    const text = getPrompt('gen_translation', { ...bookInfo, ...bookData.chapterPref||{} });
                    console.log(text);

                    console.log("请稍候，正在发起请求…");
                    const result = await gen(text,  ( message, char ) => process.stdout.write(char), 'bba-content');
                    // console.log("result", result.json);
                    if( result.json['bba-content'] )
                    {
                        sections[j].content = result.json['bba-content'];
                        sections[j].language = info.language;
                        writeData(bookData);
                    }
    
                    
                    // 测试一个就够了
                    // break;
    
                }
    
                // 休息2秒
                // 进度
                console.log(`已翻译 ${i+1}/${chapters.length} 章，${j+1}/${sections.length} 节`);

                console.log("5秒后开始翻译下一小节，按 Ctrl+C 可以中断程序");
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, 5000);
                }
                );
            }

            // break;
        }

        console.log("全部小节内容翻译完成");
    }
}

export default new GenBook();