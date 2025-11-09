import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import fs from 'fs'
import path from 'path';

import { readlineTxt, clearTxtFile, errRecord } from './file.mjs'
import { writeFile } from 'fs/promises';
import { uaList } from './config.mjs';


let fileBasePath = './assets/'
const MAX_TRY = 3
const rules = 'div>p>a'
const MAX_QUEUE_CONTAIN = 30
const WAIT_TIME = 400
let allTask = []

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


async function getImageURLFromWeb(url, urlArray, fileNameArray) {
    const dom = await createWebDom(url)
    let links = dom(rules).map((_, a) => dom(a).attr('href')).get();
    links.map((link, index) => {
        urlArray.push(link.replace('i0.wp.com/pic.4khd.com', 'img.4khd.com'))
        fileNameArray.push(link.split('-').pop().split('.')[0])
    });
}

async function createWebDom(url) {
    try {
        const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

        const response = await axios.get(url, {
            httpsAgent: agent,
            headers: { 'User-Agent': uaList[Math.floor(Math.random() * uaList.length)] }
        });
        const htmlText = response.data;
        await writeFile('./test.html', htmlText)
        const dom = cheerio.load(htmlText);
        return dom;
    } catch (error) {
        errRecord(error, 'create web dom error')
        return undefined
    }
}

async function limitConcurrency(tasks, limit = 5) {
    const result = [];
    let running = 0;
    let currentIndex = 0;

    return new Promise((resolve) => {
        const runNext = () => {
            if (currentIndex >= tasks.length && running === 0) {
                resolve(result);
                return;
            }

            while (running < limit && currentIndex < tasks.length) {
                const i = currentIndex++;
                const task = tasks[i];
                running++;
                Promise.resolve()
                    .then(() => task())
                    .then((res) => result[i] = { status: 'fulfilled', value: res })
                    .catch((err) => result[i] = { status: 'rejected', reason: err })
                    .finally(() => {
                        running--;
                        sleep(WAIT_TIME)
                        runNext();
                    });
            }
        };
        runNext();
    });
}


async function extractLinks(url) {
    try {
        const dom = await createWebDom(url);
        let imageURL = []
        let fileName = []
        let fileFoldName = dom('title').eq(0).text()
        const nextPage = dom('a.page-numbers').map((_, a) => dom(a).attr('href')).get();

        let links = dom(rules).map((_, a) => dom(a).attr('href')).get();
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
        errRecord(`${error} url: ${url}`, 'url extract err')
        fs.appendFileSync('./url.txt', `${url}\n`)
        return {
            imageURL: [],
            fileName: [],
            fileFoldName: undefined
        };
    }
}

async function downloadImage(url, fileName, fileFoldName) {
    return new Promise((resolve, reject) => {
        const folderPath = path.join(fileBasePath, fileFoldName);
        const file = path.join(folderPath, `${fileName}.png`)
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        if (fs.existsSync(file)) {
            resolve(true)
        }
        else {
            axios.get(url, {
                responseType: 'arraybuffer',
                httpsAgent: new HttpsProxyAgent('http://127.0.0.1:7890'),
                headers: { 'User-Agent': uaList[Math.floor(Math.random() * uaList.length)] }
            }).then((response) => {
                writeFile(file, response.data)
                    .then(() => {
                        console.log(`success: ${folderPath + fileName}`);
                        resolve(true)
                    })
                    .catch(error => errRecord(error, 'write file error'))
            }).catch(error => {
                console.error(`fail: ${folderPath + fileName}`);
                errRecord(error, 'download img error')
                fs.appendFile('./redownload.txt', `${url}#${fileFoldName}#${fileName}\n`, () => { })
                reject(false)
            })
        }
    })
}


async function redownload() {
    const lines = await readlineTxt('./redownload.txt');
    let fail = 0, total = lines.length
    clearTxtFile('./redownload.txt')
    let tasks = lines.map((line) => async () => {
        const [url, folderPath, fileName] = line.split('#');
        downloadImage(url, fileName, folderPath).catch(() => {
            fail++
        })
    })
    limitConcurrency(tasks, MAX_QUEUE_CONTAIN).then((result) => {
        fail += result.filter(r => r.status === 'rejected').length
    }).finally(() => {
        console.log(`download completed, total ${total}, success ${total - fail}, fail ${fail}`)
    })

}





async function scheduleDownloads(lines) {
    let ok = 0, fail = 0;
    // await Promise.all(lines.map(async (line) => {
    //     const { imageURL, fileName, fileFoldName } = await extractLinks(line);

    //     if (imageURL.length) {
    //         const tasks = imageURL.map((url, index) => async () => {
    //             await downloadImage(url, fileName[index], fileFoldName);
    //         });
    //         limitConcurrency(tasks, MAX_QUEUE_CONTAIN).then((res) => {
    //             ok += res.filter(r => r.status === 'fulfilled').length
    //             fail += res.filter(r => r.status === 'rejected').length
    //         }).finally(() => console.log(`download completed, total ${ok + fail}, success ${ok}, fail ${fail}`))
    //     }
    // }))
    
    Promise.all(lines.map(async (line) => {
        const { imageURL, fileName, fileFoldName } = await extractLinks(line);
        if (imageURL.length) {
            const tasks = imageURL.map((url, index) => async () => {
                await downloadImage(url, fileName[index], fileFoldName);
            });
            allTask.push(...tasks)
        }
    })).finally(() => {
        limitConcurrency(allTask, MAX_QUEUE_CONTAIN).then((res) => {
            ok += res.filter(r => r.status === 'fulfilled').length
            fail += res.filter(r => r.status === 'rejected').length
        }).finally(() => console.log(`download completed, total ${ok + fail}, success ${ok}, fail ${fail}`))
    })
}

export {
    scheduleDownloads,
    redownload,
    main,
    extractLinks,
    createWebDom
}

async function main() {
    const lines = await readlineTxt('./url.txt');
    clearTxtFile('./url.txt')
    await scheduleDownloads(lines);
}





