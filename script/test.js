/**
 * @file 测试脚本
 * @author sigmaliu
 */

const path = require('path');
const execSync = require('child_process').execSync;

const rootDir = path.resolve(__dirname, '../');

// 记录当前的 commit
let currentCommit = execSync('git log | head -n 1', {
    cwd: rootDir,
});

currentCommit = currentCommit.toString().split(' ').slice(1).join(' ').trim();

const binPath = path.resolve(__dirname, '../dist/index.js');

const demo1 = path.resolve(__dirname, '../demo/demo1.ts');

execSync(`node ${binPath} -a ${demo1}`, {
    cwd: rootDir,
});

const changedAuther = getAuthByEachLine(demo1);

const shouldMatch = [
    0,
    1,
    1,
    1,
    1,
    2, // //auth2
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3, // if(true)
    3,
    3,
    3,
    1, // var userAgent = {
    1,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3, // let e = {a: a, b: b, c: c, d:d};
    3,
    3,
    3,
    3,
    3,
    3,
]

changedAuther.slice(1).map((auth, index) => {
    if (!auth === `auth${shouldMatch[index]}`) {
        console.log('Test Fail');
        console.log(changedAuther);
    }
})

console.log('Test Pass');

execSync(`git reset --hard ${currentCommit}`, {
    cwd: process.cwd(),
});

function getAuthByEachLine(filePath) {
    const lineAuthMapping = [];
    const gitBlame = execSync(`git blame ${filePath}`);

    const lines = gitBlame.toString().split('\n');
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