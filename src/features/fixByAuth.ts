/**
 * @file 运用 eslint 修复文件，但是保留最后修改人信息
 * @author sigmaliu
 */

import { execSync } from 'child_process';
import AutoFixAPI from '../libs/eslilnt-autofix-api';
import {
    unknown, fileFilter, getAuthAndEmailMapping, log, globToFiles,
} from '../utils/utils';

let authEmailMapping: {
    [author: string]: string;
} = {};

export default function fixFilesByAuth(args: string[]) {
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

            const fileAdd = `git add ${files.join(' ')}`;

            let fileCommit = `git commit -m "style: autofix for ${auther} by alloylint" --author="${auther} ${email}"`;

            if (auther === unknown) {
                fileCommit = 'git commit -m "style: autofix by alloylint"';
            }

            execSync(`${fileAdd} && ${fileCommit}`);

            files = nextFiles;
        }

        log('autofix done');
    })();
}
