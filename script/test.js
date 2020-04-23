/**
 * @file 测试脚本
 * @author sigmaliu
 */

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const globby = require('globby');
const {
    buildFunc
} = require('./dist');

const rootDir = path.resolve(__dirname, '../');
const binPath = path.resolve(__dirname, '../dist/index.js');

// 记录当前的 commit
let currentCommit = execSync('git log | head -n 1', {
    cwd: rootDir,
});
currentCommit = currentCommit.toString().split(' ').slice(1).join(' ').trim();

// 编译
buildFunc();

(async () => {
    let extensions = ['js', 'jsx', 'ts', 'tsx', 'mjs'];
    let files = await globby("demo/**/*{js,ts}", {
        expandDirectories: {
            files: ['*'],
            extensions,
        },
    });

    // 运行脚本
    execSync(`node ${binPath} -a "demo/**/*"`, {
        cwd: rootDir,
    });

    for (let file of files) {
        const fileName = path.basename(file);
        const extName = path.extname(fileName);
        const expectPath = path.resolve(__dirname, `./demoExpect/${fileName.slice(0, -extName.length)}.txt`);

        const expectBlame = fs.readFileSync(expectPath, 'utf8');

        const expectAuth = parseBlameToGetAuth(expectBlame);

        const afterFixAuth = getAuthByEachLine(file);

        const lines = Object.keys(afterFixAuth);

        const fixMatchExpect = afterFixAuth.every((value, index) => value === expectAuth[index]);

        const expectMatchFix = expectAuth.every((value, index) => value === afterFixAuth[index]);

        if (fixMatchExpect && expectMatchFix) {
            console.log(`${fileName} test pass`);
        }
        else {
            console.log(`${fileName} test fail`);
        }
    }

    // 恢复到之前的 commit
    execSync(`git reset --hard ${currentCommit}`, {
        cwd: process.cwd(),
    });
})()

/**
 * 获取文件的每行作者
 * @param {string} filePath 
 */
function getAuthByEachLine(filePath) {
    const gitBlame = execSync(`git blame ${filePath}`);

    return parseBlameToGetAuth(gitBlame.toString());
}

/**
 * 解析 git blame 的结果，获取每行的作者信息
 * @param {string} gitBlame 
 */
function parseBlameToGetAuth(gitBlame) {
    const lineAuthMapping = [];
    const lines = gitBlame.split('\n');
    const len = lines.length;

    for (let i = 0; i < len; i++) {
        const line = lines[i];

        const matches = line.match(/^\w+\s+\((.*?)\s+\d+-\d+-\d+\s+.*?(\d+)\)/);

        if (matches) {
            const auth = matches[1];
            const codeLine = parseInt(matches[2], 10);

            lineAuthMapping[codeLine] = auth;
        }
    }

    return lineAuthMapping;
}