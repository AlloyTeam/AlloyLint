/**
 * @file 只是修复文件
 * @author sigmaliu
 */

import AutoFixAPI from '../libs/eslilnt-autofix-api';
import { log, globToFiles } from '../utils/utils';

const cpuNums = require('os').cpus().length;
const cluster = require('cluster');

type TInfoCount = {
    errorCount: number;
    warningCount: number;
    fixableErrorCount: number;
    fixableWarningCount: number;
};

export default function fixFilesNormal(args: string[]) {
    const autoFixAPI = new AutoFixAPI();

    (async () => {
        if (cluster.isMaster) {
            const files = await globToFiles(args);
            const fileNums = files.length;
            let workerExitCount = 0;
            const infoCount: TInfoCount = {
                errorCount: 0,
                warningCount: 0,
                fixableErrorCount: 0,
                fixableWarningCount: 0,
            };

            log('start collecting information');

            // 如果才一个文件，就不用起 worker
            if (fileNums < 2) {
                autoFixAPI.applyAutoFixToFiles(files);

                log('autofix done');
            } else {
                const workerNums = Math.min(fileNums, cpuNums);
                const remain = fileNums % workerNums;
                const eachLen = (fileNums - remain) / workerNums;

                for (let i = 0; i < workerNums; i++) {
                    const worker = cluster.fork();
                    const fileStart = (i * eachLen) + (Math.min(i, remain));
                    const fileEnd = fileStart + eachLen + (i < remain ? 1 : 0);

                    worker.send({ fileParts: files.slice(fileStart, fileEnd) });

                    worker.on('exit', () => {
                        workerExitCount++;

                        if (workerExitCount === workerNums) {
                            log(JSON.stringify(infoCount, null, 4));

                            log('autofix done');

                            process.exit(0);
                        }
                    });

                    worker.on('message', (info: {infoCount: TInfoCount}) => {
                        if (info && info.infoCount) {
                            const {
                                errorCount, warningCount, fixableErrorCount, fixableWarningCount,
                            } = info.infoCount;
                            infoCount.errorCount += errorCount;
                            infoCount.warningCount += warningCount;
                            infoCount.fixableErrorCount += fixableErrorCount;
                            infoCount.fixableWarningCount += fixableWarningCount;
                        }
                    });
                }
            }
        } else if (cluster.isWorker) {
            process.on('message', (task) => {
                if (task && task.fileParts) {
                    autoFixAPI.applyAutoFixToFiles(task.fileParts);

                    process.exit(0);
                }
            });
        }
    })();
}
