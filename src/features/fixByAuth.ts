/**
 * @file 运用 eslint 修复文件，但是保留最后修改人信息
 * @author sigmaliu
 */

import AutoFixAPI from '../libs/eslilnt-autofix-api';
import { execSync } from 'child_process';
import {
    unknown, getAuthByLines, fileFilter, getAuthAndEmailMapping, log, globToFiles
} from '../utils/utils';

interface IInfoByAuth {
    [auth: string]: {
        [file: string]: any[];
    };
}

let authEmailMapping: {
    [author: string]: string;
} = {};

export function fixFilesByAuth(args: string[]) {
    const autoFixAPI = new AutoFixAPI();

    (async () => {
        let files = await globToFiles(args);

        files = fileFilter(files);

        while (true) {
            // 所有文件的报告
            const { report, auther } = autoFixAPI.getESLintReportByAuth(files);

            if (!report) {
                break;
            }

            if (!(report.fixableErrorCount + report.fixableWarningCount > 0)) {
                break;
            }

            const { results } = report;

            const nextTasks = results.filter((res: any) => (res.fixableErrorCount + res.fixableWarningCount) > 0);
            // 更新下次需要修复的文件
            const nextFiles = nextTasks.map((task: any) => task.filePath);

            if (!nextTasks.length) {
                break;
            }

            autoFixAPI.applyAutoFixByReport(report);

            let email = authEmailMapping[auther] || '';

            // 当前映射里没有 email 信息
            if (!email) {
                for (const nextFile of nextFiles) {
                    authEmailMapping = Object.assign(authEmailMapping, getAuthAndEmailMapping(nextFile));

                    email = authEmailMapping[auther];

                    if (email) {
                        break;
                    }
                }
            }

            if (auther === unknown) {
                execSync(`git add ${files.join(' ')} && git commit -m "style: autofix by alloylint"`);
            } else {
                execSync(`git add ${files.join(' ')} && git commit -m "style: autofix for ${auther} by alloylint" --author="${auther} ${email}"`);
            }

            files = nextFiles;
        }

        log('autofix done');
    })();
}

/**
 * result: {
 *     filePath: '/Users/sigmaliu/AlloyTeam/standards-pcg-lint/demo/demo1.ts'
 *     messages: [],
 *     errorCount: 12,
 *     warningCount: 1,
 *     fixableErrorCount: 0,
 *     fixableWarningCount: 0,
 *     output: '',
 * }[]
 *
 * messages: {
 *    ruleId: 'id-length',
 *    severity: 2,
 *    message: "Identifier name 'c' is too short (< 2).",
 *    line: 20,
 *    column: 7,
 *    nodeType: 'Identifier',
 *    messageId: 'tooShort',
 *    endLine: 20,
 *    endColumn: 8,
 *    fix: { range: [ 340, 340 ], text: ',' }
 * }[]
 * @param report
 */
function parseReport(report: any) {
    let { results } = report;

    // 过滤可修复的文件
    results = results.filter((fileReport: any) => fileReport.fixableErrorCount + fileReport.fixableWarningCount > 0);

    const infoByAuth: IInfoByAuth = {};

    const setInfo = (auth: string, file: string, msg: any) => {
        if (!infoByAuth[auth]) {
            infoByAuth[auth] = {};
        }

        if (!infoByAuth[auth][file]) {
            infoByAuth[auth][file] = [];
        }

        infoByAuth[auth][file].push(msg);
    };

    // 按文件查找
    for (const result of results) {
        const { messages } = result;

        const { filePath } = result;
        const {
            errorCount, warningCount, fixableErrorCount, fixableWarningCount,
        } = result;

        // 按修复的 messages 查找
        for (const message of messages) {
            const { fix, line, endLine } = message;

            // 如果没有 fix 信息，说明不可修复，跳过
            if (!fix) {
                continue;
            }

            // 没有 endLine 说明是新增行
            if (typeof endLine === 'undefined') {
                setInfo(unknown, filePath, message);

                continue;
            }

            const { author, authorEmail } = getAuthByLines(filePath, line, endLine);

            if (author) {
                // 存下 email 的信息
                authEmailMapping[author] = authorEmail;

                setInfo(author, filePath, message);
            }
        }
    }

    return infoByAuth;
}

/**
 * 计算将要以每个作者的名义修复的错误信息的多少
 * @param infoByAuth
 */
function calculateByAuth(infoByAuth: IInfoByAuth) {
    const authCount: any = {};
    let author = '';
    let max = 0;

    for (const auth in infoByAuth) {
        if (!infoByAuth.hasOwnProperty(auth)) {
            continue;
        }

        for (const file in infoByAuth[auth]) {
            if (!infoByAuth[auth].hasOwnProperty(file)) {
                continue;
            }

            const messages = infoByAuth[auth][file];

            if (typeof authCount[auth] === 'undefined') {
                authCount[auth] = 0;
            }

            authCount[auth] += messages.length;
        }

        if (authCount[auth] > max) {
            max = authCount[auth];

            author = auth;
        }
    }

    return author;
}
