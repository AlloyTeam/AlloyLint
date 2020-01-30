# alloylint


alloylint is a tool that can run eslint --fix to autofix issues while keeping last author info in git blame. This is the best solution since you can not find another one in any way.

------

## Quick Start

### Install

```sh
npm install alloylint -D
```



### If you install alloylint in global, then start with:

```sh
alloylint file.js
```



### if you install alloylint in project  and want to start script, you should start with:

```
node ./node_modules/alloylint/dist/index.js
```



### add to npm script

```sh
"lint": "alloylint file.js"
```



### support glob pattern：

```sh
alloylint "./src/**/*"
```



for more supported glob pattern，please refer  [minimatch](https://github.com/isaacs/minimatch#usage)



------

## Work with huasky and lint-staged

### Install husky and lint-staged

```sh
npm install husky lint-staged -D
```



### add following contents in package.json ：

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

## Keep Author

### Add option `-a` or `—author`

```sh
alloylint -a "./src/**/*"
```



### For Example, there is code before run alloylint:

![before](./docs/demo1-before.png)




### after run alloylint, it shoud be:

![after](./docs/demo1-after.png)



------

### @License under MIT


