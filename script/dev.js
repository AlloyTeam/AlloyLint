/**
 * @file 本地开发编译
 * @author sigmaliu
 */

const path = require('path');
const fs = require('fs');
const { buildFunc } = require('./dist');

buildFunc();

fs.watch(path.resolve(__dirname, '../src'), { recursive: true }, () => {
    try {
        buildFunc();
    }
    catch(err) {
        console.log(err);
    }
})