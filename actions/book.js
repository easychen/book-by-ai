import { gen, getPrompt, readData, writeData } from '../lib/functions.js';
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
        const bookData = readData();
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
}

export default new GenBook();