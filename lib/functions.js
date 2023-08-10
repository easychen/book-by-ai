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

export async function gen( text, callback = ( message, char ) => process.stdout.write(char) )
{
    const content = await chat(text, callback);
    const jsonString = extractJSON(content);
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

export function extractJSON(dialogue) {
    // const regex = /({[^{}]*}|\[[^\[\]]*\])/;
    // const match = dialogue.match(regex);
    // if (match) {
    //   return match[0];
    // } else {
    //   return null;
    // }
    // 首先匹配 {} 
    const reg = /^.+?(\{.+\}).*?$/gs;
    const match = reg.exec(` ${dialogue} `);
    if( match && match[1] && canJsonParse(match[1]) ) return match[1];
    // 然后匹配 []
    const reg2 = /^.+?(\[.+\]).*?$/gs;
    const match2 = reg2.exec(` ${dialogue} `);
    if( match2 && match2[1] && canJsonParse(match2[1]) ) return match2[1];
    return false;
}

function canJsonParse(str) 
{
    try {
        JSON.parse(str);
    } catch (e) {
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
