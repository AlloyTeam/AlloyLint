/**
 * @file 工具函数
 * @author sigmaliu
 */

import fs from 'fs';
import path from 'path';
import globby from 'globby';
import { execSync } from 'child_process';

export const cwd = process.cwd();

export const unknown = 'alloylint-unknown';

export const BOM = '\uFEFF';

/**
 * 发生错误，打印信息，退出脚本
 * @param params 参数列表
 */
export function occurError(...params: any[]) {
    console.error('[alloylint]', ...params);

    process.exit(0);
}

/**
 * 打印信息
 * @param params 参数列表
 */
export function log(...params: any[]) {
    console.error('[alloylint]', ...params);
}

/**
 * 过滤掉一些文件
 * @param files 文件数组
 */
export function fileFilter(files: string[]) {
    const result = [];

    for (const file of files) {
        let contents = '';

        try {
            contents = fs.readFileSync(file, 'utf8');
        } catch (err) {
            continue;
        }

        const lines = contents.split(/\r?\n/);
        const len = lines.length;
        let isMini = false;

        for (let j = 0; j < len; j++) {
            const line = lines[j];

            const width = line.length;

            // 本来就是压缩的文件
            if (width > 1000) {
                isMini = true;

                break;
            }
        }

        if (!isMini) {
            result.push(file);
        }
    }

    return result;
}

/**
 * glob 转化成文件列表
 */
export async function globToFiles(args: string[]) {
    let extensions = ['js', 'jsx', 'ts', 'tsx', 'mjs'];

    // @ts-ignore
    let files = await globby(args, {
        expandDirectories: {
            files: ['*'],
            extensions,
        },
    });

    extensions = extensions.map((e) => `.${e}`);

    files = files.filter((file: string) => extensions.includes(path.extname(file)));

    files = files.map((file: string) => path.resolve(cwd, file));

    files = fileFilter(files);

    const filesSet = new Set(files);

    files = Array.from(filesSet);

    if (!files.length) {
        occurError('No file to be fixed');
    }

    return files;
}

/**
 * 501e975e36b73b8015ce73151ea67c6e4967af5f 1 1 1
 * author auth1
 * author-mail <auth1@tencent.com>
 * author-time 1578735415
 * author-tz +0800
 * committer sigmaliu
 * committer-mail <sigmaliu@tencent.com>
 * committer-time 1578735415
 * committer-tz +0800
 * summary auth1
 * filename demo/demo1.ts
 *      document.documentElement.style['position'] = 'fixed';
 */
export function getAuthAndEmailByBlame(gitBlame: string | string[]) {
    const lines = Array.isArray(gitBlame) ? gitBlame : gitBlame.split('\n');
    let auth = '';
    let email = '';

    for (const line of lines) {
        const each = line.split(' ');

        if (each[0] === 'author') {
            auth = each.slice(1).join(' ').trim();
        }

        if (each[0] === 'author-mail') {
            email = each.slice(1).join(' ').trim();
        }
    }

    return {
        auth,
        email,
    };
}

/**
 * 计算每个修改涉及到的行里面对这些行做最多修改的作者
 * @param filePath
 * @param line
 * @param endLine
 */
export function getAuthByLines(filePath: string, line: number, endLine: number) {
    const authCount: any = {};
    let max = 0;
    let author = '';
    let authorEmail = '';

    for (let i = line; i <= endLine; i++) {
        let auth = '';
        const email = '';

        try {
            const gitBlame = execSync(`git blame ${filePath} -L ${i},${i} --line-porcelain`);
            const { auth, email } = getAuthAndEmailByBlame(gitBlame.toString());
        } catch (err) {
            auth = unknown;
        }

        if (!authCount[auth]) {
            authCount[auth] = 0;
        }

        authCount[auth] += 1;

        if (authCount[auth] > max) {
            max = authCount[auth];

            author = auth;
            authorEmail = email;
        }
    }

    return {
        author,
        authorEmail,
    };
}

/**
 * 获取每个文件的所有行数对应的修改人
 * @param filePath
 */
export function getAuthByEachLine(filePath: string) {
    const lineAuthMapping: string[] = [];
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

/**
 * 获取每个文件出现的作者对应的邮箱
 * @param filePath
 */
export function getAuthAndEmailMapping(filePath: string) {
    const authEmailMapping: {[auth: string]: string} = {};

    const gitBlame = execSync(`git blame ${filePath} --line-porcelain`).toString();

    const lines = gitBlame.split('\n');
    const len = lines.length;

    for (let i = 0; i < len; i += 13) {
        const { auth, email } = getAuthAndEmailByBlame(lines.slice(i, i + 13));

        authEmailMapping[auth] = email;
    }

    return authEmailMapping;
}
