/**
 * @file 只是修复文件
 * @author sigmaliu
 */

import AutoFixAPI from '../libs/eslilnt-autofix-api';
import { log, globToFiles } from '../utils/utils';

export function fixFilesNormal(args: string[]) {
    const autoFixAPI = new AutoFixAPI();

    (async () => {
        const files = await globToFiles(args);

        autoFixAPI.applyAutoFixToFiles(files);

        log('autofix done');
    })();
}
