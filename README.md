
#### **安装：**

```sh
npm install alloylint -D
```



如果是安装到全局，那么启动命令为

```sh
alloylint
```



如果是安装到项目，那么运行命令为

```
node ./node_modules/alloylint/dist/index.js
```



------




**添加到 npm script 里：**

```sh
"lint:keepAuthor": "alloylint -a xxx"
```

------



#### **修复某个文件：**

```sh
alloylint index.ts
```



支持 glob 的语法：

如修复某个文件夹内的所有文件：

```sh
alloylint "./src/**/*"
```



更多支持的 glob 语法，可以参考 [minimatch](https://github.com/isaacs/minimatch#usage)



------



#### 实现 commit 的时候自动修复

安装 husky 和 lint-staged

```sh
npm install husky lint-staged -D
```



在 package.json 里添加：

```json
    "husky": {
        "hooks": {
            "pre-commit": "lint-staged"
        }
    },
    "lint-staged": {
        "*.{js,ts}": [
            "alloylint",
            "git add"
        ]
    }
```



------



#### **保留最后修改人信息**

```sh
alloylint -a "src/**/*"
```



假设有一段源代码 git blame 信息为

```sh
xxx (auth1 xxx  1) document.documentElement.style['position'] = 'fixed';
xxx (auth1 xxx  2)
xxx (auth1 xxx  3) var ua = navigator.userAgent.toLowerCase();
xxx (auth1 xxx  4)
xxx (auth2 xxx  5) //auth2
xxx (auth2 xxx  6) // auth2
xxx (auth2 xxx  7)
xxx (auth2 xxx  8) var dbName = 'dbName'
xxx (auth2 xxx  9)
xxx (auth2 xxx 10) const storeName = 'storeName';
xxx (auth2 xxx 11)
xxx (auth2 xxx 12) console.log('创建[ ' + dbName + ' / ' + storeName + ' ]成功');
xxx (auth2 xxx 13)
xxx (auth3 xxx 14) if(true)
xxx (auth3 xxx 15) {
xxx (auth3 xxx 16)   console.log()
xxx (auth3 xxx 17) } else { console.log()}
xxx (auth3 xxx 18)
xxx (auth1 xxx 19) var userAgent = {
xxx (auth1 xxx 20)     ua: ua
xxx (auth2 xxx 21) }
xxx (auth2 xxx 22)
xxx (auth2 xxx 23) const a = 1;
xxx (auth2 xxx 24) var b = 2;
xxx (auth2 xxx 25) const c = 3;
xxx (auth2 xxx 26) let d = 4;
xxx (auth2 xxx 27)
xxx (auth3 xxx 28) let e = {a: a, b: b, c: c, d:d};
xxx (auth3 xxx 29)
xxx (auth3 xxx 30) let f,
xxx (auth3 xxx 31)   g,
xxx (auth3 xxx 32)   h;
```





那么在被格式化后，就变成了以下的样子。可以看到即使行列有变动，仍然和原代码的最后修改人一致



```sh
xxx (auth1 xxx  1) document.documentElement.style.position = 'fixed';
xxx (auth1 xxx  2)
xxx (auth1 xxx  3) const ua = navigator.userAgent.toLowerCase();
xxx (auth1 xxx  4)
xxx (auth2 xxx  5) // auth2
xxx (auth2 xxx  6) // auth2
xxx (auth2 xxx  7)
xxx (auth2 xxx  8) const dbName = 'dbName';
xxx (auth2 xxx  9)
xxx (auth2 xxx 10) const storeName = 'storeName';
xxx (auth2 xxx 11)
xxx (auth2 xxx 12) console.log(`创建[ ${dbName} / ${storeName} ]成功`);
xxx (auth2 xxx 13)
xxx (auth3 xxx 14) if (true) {
xxx (auth3 xxx 15)     console.log();
xxx (auth3 xxx 16) } else { console.log(); }
xxx (auth3 xxx 17)
xxx (auth1 xxx 18) const userAgent = {
xxx (auth1 xxx 19)     ua,
xxx (auth2 xxx 20) };
xxx (auth2 xxx 21)
xxx (auth2 xxx 22) const a = 1;
xxx (auth2 xxx 23) const b = 2;
xxx (auth2 xxx 24) const c = 3;
xxx (auth2 xxx 25) const d = 4;
xxx (auth2 xxx 26)
xxx (auth3 xxx 27) const e = {
xxx (auth3 xxx 28)     a, b, c, d,
xxx (auth3 xxx 29) };
xxx (auth3 xxx 30)
xxx (auth3 xxx 31) let f;
xxx (auth3 xxx 32) let g;
xxx (auth3 xxx 33) let h;
```





#### 附：

不能自动修复的规则(修复后的代码有问题)：

- @typescript-eslint/prefer-string-starts-ends-with





如果还有发现有什么规则是有问题的，可以帮忙提 issue 添加进去





