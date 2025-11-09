import { writeFile, appendFile, mkdir } from 'node:fs/promises'
import readline from 'readline'
import { dirname } from 'node:path';
import fs from 'fs'

const errPath = './log/error.txt'
const redownloadPath = './redownload.txt'

async function clearTxtFile(filePath) {
    await writeFile(filePath, '')
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

async function errRecord(error, desc) {
    const errMsg = `[${new Date()}] [${desc}] : ${error}\n`
    await mkdir(dirname(errPath), { recursive: true })
    await appendFile(errPath, errMsg)
}


export {
    clearTxtFile,
    readlineTxt,
    errRecord
}