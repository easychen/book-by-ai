import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// 如果 .env 文件存在，则加载环境变量
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  // 读取 .env 文件
  const envConfig = dotenv.parse(fs.readFileSync(envPath));

  // 将 .env 文件中的键值对放入当前环境
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
}

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Please input module name');
  process.exit(1);
}

let methodName = 'main';
let moduleName = args[0];
const moduleArgs = args.slice(1);

console.log(moduleName, moduleArgs);

if (moduleName.includes('@')) {
  const [moduleNameWithoutMethod, specifiedMethod] = moduleName.split('@');
  moduleName = moduleNameWithoutMethod;
  methodName = specifiedMethod;
}

// 加载模块
const modulePath = path.join(__dirname, 'actions', moduleName + '.js');
if (!fs.existsSync(modulePath)) {
  console.error('module not found');
  process.exit(1);
}

const customModule = await import(modulePath).then((m) => m.default);

// 运行模块的main方法
if (typeof customModule[methodName] === 'function') {
  customModule[methodName](moduleArgs);
} else {
  console.error(`method ${methodName} not found`);
  process.exit(1);
}