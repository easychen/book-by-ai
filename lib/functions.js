import Api2d from 'api2d';
import prompts from './prompts.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function hello()
{
    console.log('Hello World!');
}

export async function chat( message, onMessage=null, onEnd=null )
{
    const api = new Api2d(process.env.OPENAI_API_KEY, process.env.OPENAI_API_ENDPOINT, 60*5*1000 );
    const response = await api.completion({
        messages : [{"role":"user","content":message}],
        stream: true,
        model: process.env.OPENAI_API_MODEL||"gpt-4-32k",
        onMessage: onMessage,
        onEnd: onEnd,
    });
    return response;
}

export async function gen( text, callback = ( message, char ) => process.stdout.write(char), tag = null )
{
    const content = await chat(text, callback);
    const jsonString = extractJSON(content,tag);
    const obj = jsonString ? JSON.parse(jsonString) : null;
    const result = {
        content,
        json: obj,
    }
    // 从 result 中提取JSON部分
    return result;
}

export function getPrompt( key, data )
{
    const template = prompts[key];
    // 从template中提取`{{...}}`形式的变量
    const matches = template.matchAll(/{{(.*?)}}/g);
    // 将变量替换为data中的值
    let result = template;
    for (const match of matches) {
        const [placeholder, key] = match;
        result = result.replace(placeholder, data[key]);
    }
    return result;
}

export function extractJSON(dialogue,tag = null) {
    
    if( tag )
    {
        // 提取 <tag>...</tag> 中间的内容
        const reg = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
        const match = reg.exec(` ${dialogue} `);
        const match_1 = match && match[1] ? match[1]: null;
        // const match_1 = match && match[1] ? match[1].replaceAll(",","，"): null;
        return JSON.stringify({[tag]:match_1});
    }else
    {
        const reg = /^.+?(\{.+\}).*?$/gs;
        const match = reg.exec(` ${dialogue} `);
        const match_1 = match && match[1] ? clean(match[1]): null;
        if( match_1 && canJsonParse(match_1) ) return match_1;
        // 然后匹配 []
        const reg2 = /^.+?(\[.+\]).*?$/gs;
        const match2 = reg2.exec(` ${dialogue} `);
        const match2_1 = match2 && match2[1] ? clean(match2[1]): null;
        if( match2_1&& canJsonParse(match2_1) ) return match2_1;
        return false;
    }
}

function clean( str )
{
    // 用正则去掉所有的空白格，将换行符替换为\n
    str = str.replace(/\s+/g, "").replace(/\\n/g, "\n");
    return str;
}

function canJsonParse(str) 
{
    try {
        JSON.parse(str);
    } catch (e) {
        console.log(str, e);
        return false;
    }
    return true;
}

// 编写两个函数，从数据目录(../data)中读取数据和写入数据
export function readData( filename = path.join(__dirname, '../data/data.json') )
{
    // 如果文件不存在，返回空对象
    if( fs.existsSync(filename) === false )
    {
        return {};
    }else
    {
        return JSON.parse(fs.readFileSync(filename, {
            encoding: 'utf-8',
        }));
    }
}

export function writeData( data, filename = path.join(__dirname, '../data/data.json') )
{
    // 将数据转换为JSON字符串
    const jsonString = JSON.stringify(data, null, 2);
    // 将JSON字符串写入文件
    fs.writeFileSync(filename, jsonString);
    return true;
}
