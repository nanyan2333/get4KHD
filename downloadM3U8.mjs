#!/usr/bin/env node
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

async function main() {
    // 配置代理地址（如果不需要代理，可以将这行删除）
    const proxy = 'http://127.0.0.1:7890';
    const browser = await puppeteer.launch({
        args: [`--proxy-server=${proxy}`]
    });

    const page = await browser.newPage();

    // 如果代理服务器需要身份验证，可以取消下面代码的注释，并填写相应的用户名和密码
    // await page.authenticate({ username: 'your-username', password: 'your-password' });

    // 设置一个标识，避免捕获到多个 m3u8 请求后重复转换
    let processed = false;

    // 监听页面中所有请求，捕获包含 .m3u8 的请求
    page.on('request', request => {
        const url = request.url();
        if (!processed && url.includes('.m3u8')) {
            console.log('捕获到 m3u8 请求:', url);
            processed = true;
            // 调用转换函数
            convertM3U8ToMP4(url);
        }
    });

    // 打开目标网页（请替换成你要爬取的页面 URL）
    await page.goto('https://hlbdy.me/archives/175298.html', { waitUntil: 'networkidle2' });
    // 根据页面情况等待足够的时间以确保 m3u8 请求已经发起
    // await page.waitFor(10000);
    await browser.close();
}

// 使用 ffmpeg 将 m3u8 转换为 mp4 文件
function convertM3U8ToMP4(url) {
    console.log(`开始使用 ffmpeg 转换 m3u8 到 mp4，输入链接：${url}`);
    // ffmpeg 命令参数解释：
    // -i <输入>：输入的 m3u8 链接
    // -c copy  : 直接复制编码（不重新编码），速度快且无损
    // output.mp4：输出的 mp4 文件名称
    const ffmpegArgs = ['-i', url, '-c', 'copy', 'output.mp4'];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

    ffmpegProcess.on('close', (code) => {
        if (code === 0) {
            console.log('转换成功，输出文件：output.mp4');
        } else {
            console.error(`ffmpeg 进程异常退出，退出码: ${code}`);
        }
    });
}

main();
