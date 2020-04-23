/**
 * @file 用 eslint 修复文件的 api
 * @author sigmaliu
 */

import fs from 'fs';
import path from 'path';
import { CLIEngine } from 'eslint';
import {
    occurError, log, cwd, getAuthByEachLine, BOM, unknown,
} from '../utils/utils';

interface IMessage {
    column: number; // - 出错的列。
    line: number; // - 出错的行。
    message: string; // - 应该被输出的信息。
    ruleId: string; // - 触发该消息的规则的 ID (如果 fatal 为true则此值为null)。
    severity: number; // - 根据你的配置，值为1或2。
    endColumn: number; // - 错误发生的范围的结束列 (如果不是范围，这个属性会被省略)。
    endLine?: number; // - 错误发生的范围的结束行 (如果不是范围，这个属性会被省略)。
    fix?: { // - 描述修复问
        range: [number, number]; // 要做替换的源码的位置，开始位置和结束位置
        text: string; // 要用来替换源码的内容
    };
}

const IS_DEMO = process.env.MODE === 'demo';
const IS_VUE = process.env.TYPE === 'vue';

export default class AutoFixAPI {
    /**
     * 修复文件
     * @param files 文件列表
     */
    public applyAutoFixToFiles = (files: string[]) => {
        try {
            log('start collecting information');

            const baseConfig = this.getBaseConfig();

            // @ts-ignore
            const cli = new CLIEngine(baseConfig);

            const report = cli.executeOnFiles(files);

            const {
                errorCount, warningCount, fixableErrorCount, fixableWarningCount,
            } = report;

            log(JSON.stringify({
                errorCount,
                warningCount,
                fixableErrorCount,
                fixableWarningCount,
            }, null, 4));

            log('applying autofix');

            CLIEngine.outputFixes(report);
        } catch (err) {
            occurError(err);
        }
    };

    /**
     * 生成某个最后修改人所涉及到的文件和代码的修复报告
     * @param files 文件列表
     */
    public getESLintReportByAuth = (files: string[]) => {
        // CLIEngine 的基本配置，和其他修复 API 通用的
        const baseConfig = this.getBaseConfig();
        // 统计每个文件可被修复的问题数
        let [fixableErrorCount, fixableWarningCount] = [0, 0];
        // 统计所有文件总计的可被修复的问题数
        let [totalErrorCount, totalWarningCount, totalFixableErrorCount, totalFixableWarningCount] = [0, 0, 0, 0];
        // 重写每个文件结果的 messages 数组
        let messages: IMessage[] = [];
        // 记录上次解析的文件
        let lastFile = '';
        // 当前解析的文件
        let currentFile = '';
        // 记录当前解析的文件的每一行所对应的修改人
        let authByEachLine: string[] = [];
        // 当前解析文件的源码
        let sourceCode = '';
        // 当次生成报告所要修复的最后修改人
        let filterAuth = '';
        // 当前文件是否含有 BOM 开头
        let bom = sourceCode.startsWith(BOM) ? BOM : '';
        // 移除源码的 BOM 开头
        sourceCode = bom ? sourceCode.slice(1) : sourceCode;
        // 已经解析到源码的哪个位置
        let lastPos = Number.NEGATIVE_INFINITY;
        // 对源码做修改后的内容
        let output = bom;

        /**
         * 根据 fix 信息对源码做修改
         * @param fix 要对源码做修改的信息
         */
        const attemptFix = (fix: { range: [number, number]; text: string }) => {
            const start = fix.range[0];
            const end = fix.range[1];

            // 非法范围信息
            if (lastPos >= start || start > end) {
                return false;
            }

            // 移除 BOM
            if ((start < 0 && end >= 0) || (start === 0 && fix.text.startsWith(BOM))) {
                output = '';
            }

            // 根据 fix 信息修复代码
            output += sourceCode.slice(Math.max(0, lastPos), Math.max(0, start));
            output += fix.text;
            lastPos = end;

            sourceCode = output;
            output = '';

            return true;
        };

        // @ts-ignore eslint 的提示是错的，fix 可以是 boolean，也可以是 () => boolean
        baseConfig.fix = (info: IMessage) => {
            messages.push(info);

            const { fix, line } = info;

            // 不可修复，直接返回
            if (!fix) {
                return false;
            }

            let shouldFix = false;

            // 处理的文件变化了
            if (lastFile !== currentFile) {
                lastFile = currentFile;

                // 生成未修复前的文件每一行的最后修改人
                authByEachLine = getAuthByEachLine(currentFile);

                // 读取文件内容
                sourceCode = fs.readFileSync(currentFile, 'utf8');

                // 更新记录当前文件的基本信息
                bom = sourceCode.startsWith(BOM) ? BOM : '';
                sourceCode = bom ? sourceCode.slice(1) : sourceCode;
                lastPos = Number.NEGATIVE_INFINITY;
                output = bom;
            }

            const [codeStart, codeEnd] = fix.range;

            // 获取将要被改变的源码信息
            const changedCode = sourceCode.slice(codeStart, codeEnd);

            const originLineCount = fix.text.split('\r?\n').length;
            const changeLineCount = changedCode.split('\r?\n').length;

            const changeAuth = authByEachLine[line] || unknown;

            // 行数有变动，更新 authByEachLine
            if (originLineCount !== changeLineCount) {
                authByEachLine.splice(line, originLineCount, ...(new Array(changeLineCount).fill(changeAuth)));
            }

            // 第一次找到了当次要做修复的作者, 要包含当次 fix 信息
            if (!filterAuth) {
                filterAuth = changeAuth;

                shouldFix = true;
            } else if (changeAuth === filterAuth) {
                // 符合当次修复的作者，要包含当次 fix 信息
                shouldFix = true;
            }

            if (shouldFix) {
                // 运用修复，更新文件源码
                shouldFix = attemptFix(fix);
            }

            // 确实被修复了，更新统计信息
            if (shouldFix) {
                if (info.severity === 2) {
                    fixableErrorCount += 1;
                } else if (info.severity === 1) {
                    fixableWarningCount += 1;
                }
            }

            return shouldFix;
        };

        const report: any = {
            results: [],
        };

        // @ts-ignore
        const cli = new CLIEngine(baseConfig);

        for (const file of files) {
            // 为了让 fix 函数取得当前处理的文件名的
            currentFile = file;

            // 重置统计每个文件的变量
            messages = [];
            fixableErrorCount = 0;
            fixableWarningCount = 0;

            const result = cli.executeOnFiles([file]).results[0];

            // executeOnFiles 生成的 messages 没有 fix 信息，所以这里替换掉
            result.messages = messages;

            // 更新每个文件的统计信息
            result.fixableErrorCount = fixableErrorCount;
            result.fixableWarningCount = fixableWarningCount;

            // 更新整个报告的统计信息
            totalErrorCount += result.errorCount;
            totalWarningCount += result.warningCount;
            totalFixableErrorCount += fixableErrorCount;
            totalFixableWarningCount += fixableWarningCount;

            report.results.push(result);
        }

        report.errorCount = totalErrorCount;
        report.warningCount = totalWarningCount;
        report.fixableErrorCount = totalFixableErrorCount;
        report.fixableWarningCount = totalFixableWarningCount;

        return {
            report,
            auther: filterAuth,
        };
    };

    /**
     * 根据 report 运用修复
     * @param report
     */
    applyAutoFixByReport = (report: any) => {
        CLIEngine.outputFixes(report);
    };

    /**
     * 初始化
     */
    private getBaseConfig = () => {
        const ignoreFile = this.getFile('.eslintignore.json', '.eslintignore');
        let config = this.getFile('.eslintrc.json', '.eslintrc.js');

        if (IS_DEMO && IS_VUE) {
            config = this.getFile('.eslintrc-vue.json');
        }

        if (!config) {
            occurError('can not find .eslintrc.json or .eslintrc.js');
        }

        let ignoreConfig = {
            ignore: false,
            ignorePath: '',
        };

        if (ignoreFile && !IS_DEMO) {
            ignoreConfig = {
                ignore: true,
                ignorePath: ignoreFile,
            };
        }

        return {
            ...ignoreConfig,
            useEslintrc: true,
            configFile: config,
            fix: true,
            // @ts-ignore
            fixTypes: ['problem', 'suggestion', 'layout'],
            rules: {
                '@typescript-eslint/prefer-string-starts-ends-with': 'off', // autofix不能修复这条规则，会修出问题
            },
        };
    };

    /**
     * 备选文件
     * @param prefer
     * @param backup
     */
    private getFile(prefer: string, backup: string = '') {
        const prePath = path.resolve(cwd, prefer);
        const backPath = path.resolve(cwd, backup);

        if (fs.existsSync(prePath)) {
            return prePath;
        }
        if (backup && fs.existsSync(backPath)) {
            return backPath;
        }

        return null;
    }
}
