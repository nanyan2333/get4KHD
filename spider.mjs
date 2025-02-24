import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import fs from 'fs'
import readline from 'readline'
import path from 'path';

var fileBasePath = './assets/'

async function getImageURLFromWeb(url, urlArray, fileNameArray) {
    const $ = await createWebDom(url)
    var links = $('div>p>a').map((_, a) => $(a).attr('href')).get();
    links.shift()
    links.map((link, index) => {
        urlArray.push(link.replace('i0.wp.com/pic.4khd.com', 'img.4khd.com'))
        fileNameArray.push(link.split('-').pop().split('.')[0])
    });
}

async function createWebDom(url) {
    const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

    const response = await axios.get(url, {
        httpsAgent: agent,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const htmlText = response.data;
    const $ = cheerio.load(htmlText);
    return $;

}

async function extractLinks(url) {
    try {
        const $ = await createWebDom(url);
        var imageURL = []
        var fileName = []
        var fileFoldName = fileFoldName = $('title').eq(0).text()


        const nextPage = $('a.page-numbers').map((_, a) => $(a).attr('href')).get();

        var links = $('div>p>a').map((_, a) => $(a).attr('href')).get();
        links.shift()
        links.map((link, index) => {
            imageURL.push(link.replace('i0.wp.com/pic.4khd.com', 'img.4khd.com'))
            fileName.push(link.split('-').pop().split('.')[0])
        });

        await Promise.all(nextPage.map(async (link) => {
            await getImageURLFromWeb(link, imageURL, fileName);
        }));

        return { imageURL, fileName, fileFoldName };

    } catch (error) {
        console.error("Error fetching or parsing:", error);
        return null;
    }
}

async function downloadImage(url, fileName, fileFoldName) {
    const folderPath = path.join(fileBasePath, fileFoldName);

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            httpsAgent: new HttpsProxyAgent('http://127.0.0.1:7890'),
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        fs.writeFileSync(path.join(folderPath, `${fileName}.png`), response.data);
    } catch (error) {
        console.error("Error downloading image:", error);
        fs.appendFile('./redownload.txt', `${url}#${folderPath}#${fileName}.png\n`, (err) => { if (err) console.log(err) })
    }
}

export async function redownload(){
    const lines = await readlineTxt('./redownload.txt');
    await Promise.all(lines.map(async (line) => {
        const [url, folderPath, fileName] = line.split('#');
        await downloadImage(url, fileName, folderPath);
    }));
}

async function readlineTxt(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    const lines = [];
    for await (const line of rl) {
        lines.push(line);
    }
    return lines;
}

function clearTxtFile(filePath){
    fs.writeFileSync(filePath, '');
}

async function scheduleDownloads() {
    const lines = await readlineTxt('./url.txt');
    await Promise.all(lines.map(async (line) => {
        const { imageURL, fileName, fileFoldName } = await extractLinks(line);
        await Promise.all(imageURL.map(async (url, index) => {
            await downloadImage(url, fileName[index], fileFoldName);
        }));
    }));
    clearTxtFile('./url.txt')
}

scheduleDownloads();



