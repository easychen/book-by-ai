import Api2d from 'api2d';
import prompts from './prompts.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'process';
import puppeteer from 'puppeteer-core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
const turndownService = new TurndownService();
import nodeFetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
// const iconv = require('iconv-lite');
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function hello()
{
    console.log('Hello World!');
}

export async function genImage( text, style = '' )
{
    if( !text ) return false;
    if( !style ) style = process.env.IMAGE_PRESET_STYLE||'cinematic';

    const payload = {
        "text_prompts":[
            {"text":text,"weight":1}
        ],
        "style_preset":style,
        "samples": parseInt(process.env.IMAGE_COUNT||1) > 4 ? 4 : parseInt(process.env.IMAGE_COUNT||1),
    }


    const api = new Api2d(process.env.API2d_KEY, process.env.API2d_ENDPOINT, 60*5*1000 );
    const result = await api.request(
        {
            path: '/sd/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
            method: 'POST',
            body: JSON.stringify(payload),
        }
    );
    // console.log(result);
    return result;
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
        noCache: true,
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

export const outputDir = path.join(__dirname, '../output');
export const baseDir = path.join(__dirname, '..');

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
        const match_1 = match && match[1] ? match[1]: null;
        if( match_1 && canJsonParse(match_1) ) return match_1;
        // 然后匹配 []
        const reg2 = /^.+?(\[.+\]).*?$/gs;
        const match2 = reg2.exec(` ${dialogue} `);
        const match2_1 = match2 && match2[1] ? match2[1]: null;
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
    // 确保目录存在
    fs.mkdirSync(path.dirname(filename), {
        recursive: true,
    });
    // 将JSON字符串写入文件
    fs.writeFileSync(filename, jsonString);
    return true;
}

export async function snap(url, outputPath, headless = true) {
    let opt = {
        args: ['--no-sandbox'],
        defaultViewport: null,
        headless,
        timeout: 1000*60, // 一分钟超时时间
        executablePath:process.env.CHROME_PATH||"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome",
    };
    const browser = await puppeteer.launch(opt);
    const page = await browser.newPage();
    await page.goto(url);
    await page.screenshot({ path: outputPath });
    await browser.close();
  }

export async function search( query, sites = false, headless = true, extend = false )
{
    let opt = {
        args: ['--no-sandbox'],
        defaultViewport: null,
        headless,
        timeout: 1000*60, // 一分钟超时时间
        executablePath:process.env.CHROME_PATH||"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome",
    };
    const browser = await puppeteer.launch(opt);
    const page = await browser.newPage();
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(sites ? sites.map( site => `site:${site}` ).join(' ') + ' filetype:html ' + query : ' filetype:html ' + query);
    console.log("search", decodeURIComponent(url));
    await page.goto(url);

    let results_all = await page.evaluate(() => {
        let data = [];
        let elements = document.querySelectorAll('.g');
        for (var element of elements) {
            let title = element.querySelector('a').innerText?.trim();
            let link = element.querySelector('a').href;
            let snippet = element.innerText.trim().split('\n').pop();
            data.push({title, link, snippet});
        }
        return data;
    });

    // sleep 200s
    // await new Promise(resolve => setTimeout(resolve, 200000));

    await browser.close();
    // 取前5篇内容
    let results = results_all.slice(0,6);
    if( !extend ) return results;

    let extended_results = [];
    for (let result of results) {
        let markdown = await fetch_url(result.link, 5000);
        if (markdown) {
            result.markdown = markdown;
            extended_results.push(result);
        }
    }
    return extended_results;
}


export async function fetch_url(url, length = 3000, timeout = 10*1000) {
  try {
    console.log("fetch_url", decodeURIComponent(url));
    const response = await myFetch(url, {timeout});
    if( !response ) return false;
    
    let html = '';
    // 如果字符集不是utf-8，转换为utf-8
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('charset=') !== -1) {
        const charset = contentType.split('charset=')[1];
        console.log("charset", charset);
        if (charset.toLowerCase() !== 'utf-8') {
            // 转码
            const buffer = await response.buffer();
            html = iconv.decode(buffer, charset);
        }
    }else
    {
        // utf-8 无需转码
        html = await response.text();
    }
 
    const dom = new JSDOM(html, { url } );
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    let markdown = false;

    if (article && article.content) {
        markdown = turndownService.turndown(article.content);
    } else {
        if (dom.window.document) 
        {
            markdown = turndownService.turndown(dom.window.document);
        }else
        {
            throw new Error('Failed to extract content');
        }
    }
    return markdown ? ( length ? markdown.substring(0, length) : markdown) : false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function myFetch (url, options)
{
    return new Promise( async (resolve, reject) => {
        const { timeout, ...otherOptions } = options;
        const proxy = process.env.HTTP_PROXY || process.env.http_proxy || false;
        const data = {
        ...otherOptions,
        ...( proxy? { "agent": new HttpsProxyAgent(proxy) } : {})
        };
        const controller = new AbortController();
        const timeout_handle = setTimeout(() => {
            console.log("timeout", url);
            controller.abort();
            resolve(false);
        }, timeout);

        try {
            const ret = await nodeFetch(url, {data, signal: controller.signal});
            if( timeout_handle ) clearTimeout(timeout_handle);
            resolve(ret);
        } catch (error) {
            console.log("error", url, error);
        }
    });
};
