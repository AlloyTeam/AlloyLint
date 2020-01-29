#!/usr/bin/env node

/**
 * @file eslint 修复文件
 * @author sigmaliu
 */

import program from 'commander';
import { fixFilesNormal } from './features/fixNormal';
import { fixFilesByAuth } from './features/fixByAuth';

(() => {
    // 解析参数
    program
        .option('-a, --author', 'apply eslint autofix but keep last author info in git blame');

    program.parse(process.argv);

    if (program.auth) {
        fixFilesByAuth(program.args);

        return;
    }

    fixFilesNormal(program.args);
})();
