'use strict';
const fs = require('fs');
const pth = require('path');
const chalk = require('chalk');
const tmpl = require('./underscore.js');
let inquirer;
let spawn = require('child_process').spawn;
let crypto = require('crypto');
let bigfont;
let request;
let os;

let _ = {
    exists(path) {
        return fs.existsSync(path);
    },
    /**
     * 递归创建目录
     */
    mkdir(path, mode) {
        if (typeof mode === 'undefined') {

            mode = 511 & (~process.umask());
        }
        if (_.exists(path)) {
            return;
        }
        path.split('/').reduce((prev, next) => {
            if (prev && !_.exists(prev)) {
                fs.mkdirSync(prev, mode);
            }
            return prev + '/' + next;
        });
        if (!_.exists(path)) {
            fs.mkdirSync(path, mode);
        }
    },
    write(path, data, append) {
        if (!_.exists(path)) {
            _.mkdir(pth.dirname(path));
        }
        if (append) {
            fs.appendFileSync(path, data, null);
        } else {
            fs.writeFileSync(path, data, null);
        }
    },
    getDirs(path) {
        let files,
            ret = {
                dir: {},
                files: {}
            };

        files = fs.readdirSync(path);

        files.forEach((v) => {
            let fPath = pth.join(path, v),
                stat = fs.statSync(fPath);

            if (stat.isDirectory) {
                ret.dir[v] = 1;
            } else {
                ret.files[v] = 1;
            }
        });

        return ret;
    },
    read(path) {
        var content = false;

        if (_.exists(path)) {
            content = fs.readFileSync(path);
        } else {
            _.hint('error', path + '不存在');
        }
        return content;
    },
    isFile(path) {
        return _.exists(path) && fs.statSync(path).isFile();
    },

    isDir(path) {
        return _.exists(path) && fs.statSync(path).isDirectory();
    },
    /**
     * 终端提示信息
     */
    hint(type, msg) {
        if (!msg) {
            msg = type;
        }
        switch (type) {
            case 'error':
                console.log(chalk.red('[错误] ') + msg);
                break;
            case 'success':
                console.log(chalk.green('[成功] ') + msg);
                break;
            case 'info':
                console.log(chalk.cyan('[提示] ') + msg);
                break;
            case 'warn':
                console.log(chalk.yellow('[警告] ') + msg);
                break;
            default:
                console.log(chalk.magenta(`${msg}`));
        }
    },
    stdout(msg, pos) {
        var stdout = process.stdout,
            str = '\r';

        if (msg && /[^\s]/.test(msg)) {
            str = `>>>>${msg}`.substring(0, stdout.columns - 10);
            pos = pos || 0;
            stdout.clearLine();
            stdout.cursorTo(pos);
            stdout.write(chalk.green(str));
        } else if (arguments.length == 0) {
            pos = pos || 0;
            stdout.clearLine();
            stdout.cursorTo(pos);
            stdout.write(str);
        }

    },
    /**
     * 获得字符串实际长度，中文2，英文1
     * 控制台中中文占用2个英文字符的宽度
     */
    getDisplayLength(str) {
        var realLength = 0,
            len = str.length,
            charCode = -1;

        for (var i = 0; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode >= 0 && charCode <= 128) {
                realLength += 1;
            } else {
                realLength += 2;
            }
        }
        return realLength;
    },

    getStrOccRowColumns(str) {
        var outputStream = process.stdout;
        // var consoleMaxRows = outputStream.rows;
        var consoleMaxColumns = outputStream.columns;
        var strDisplayLength = _.getDisplayLength(str);
        var rows = parseInt(strDisplayLength / consoleMaxColumns, 10);
        var columns = parseInt(strDisplayLength - rows * consoleMaxColumns, 10);

        return {
            rows: rows,
            columns: columns
        };
    },
    /**
     * 获取系统的用户目录
     * @return {string}
     */
    getUserDir() {
        let dir = _._userDir;

        if (dir) {
            return dir;
        }
        if ('HOME' in process.env) {
            _._userDir = process.env['HOME'];
        } else {
            _._userDir = process.env['HOMEDRIVE'] + process.env['HOMEPATH'];
        }
        return _._userDir;
    },
    /**
     * 获取bibo的目录
     * @return {string}
     */
    getBiboDir() {
        let dir = _._biboDir;

        if (dir) {
            return dir;
        }
        _._biboDir = pth.join(_.getUserDir(), '.bibo-tmp');
        return _._biboDir;
    },
    /**
     * 创建bibo的目录
     */
    createBiboDir() {
        let biboDir = _.getBiboDir();

        if (!_.exists(biboDir)) {
            _.mkdir(biboDir);
        }
    },
    getCurrentBiboConfigDir() {
        var biboDir = _.getBiboDir();

        return pth.join(biboDir, _.md5(process.cwd()));
    },
    createCurrentBiboConfigDir() {
        let dir = _.getCurrentBiboConfigDir();

        if (!_.exists(dir)) {
            _.mkdir(dir);
        }
    },
    /**
     * 创建模板签出的项目目录
     */
    createTemplateDir() {
        let tmpCheckoutDir = _.getTemplateDir();

        if (!_.exists(tmpCheckoutDir)) {
            _.mkdir(tmpCheckoutDir);
        }
    },
    getTemplateDir() {
        return pth.join(_.getCurrentBiboConfigDir(), 'template');
    },
    /**
     * 哔啵配置文件是否存在
     * @return {Boolean}
     */
    isExistsConfig() {
        let configPath = _.getCurrentBiboConfigDir();

        return _.exists(configPath);
    },
    getBiboPluginDir() {
        return _.createBiboPluginDir();
    },
    createBiboPluginDir() {
        var dir = pth.join(_.getBiboDir(), 'plugin');

        if (!_.exists(dir)) {
            _.write(pth.join(dir, 'package.json'), _.formatJSONString({
                name: 'bibo-plugin-solution',
                description: 'bibo的插件和扩展的安装目录',
                license: 'MIT',
                repository: {}
            }));
        }
        return dir;
    },
    /**
     * 获取哔啵的配置文件路径
     * @return {string}
     */
    getBiboConfigPath() {
        let configPath = pth.join(_.getCurrentBiboConfigDir(), 'config.json');

        return configPath;
    },
    /**
     * 是否是OSX系统
     * @return {Boolean}
     */
    isOSX() {
        if (!os) {
            os = require('os');
        }
        return os.type() === 'Darwin';
    },
    getSublimeTextPath(flag) {
        let IDEPATH = '/Applications/Sublime{0} Text.app/Contents/SharedSupport/bin/subl';

        if (flag) {
            return IDEPATH.replace('{0}', '');
        } else {
            return IDEPATH.replace('{0}', '\\');
        }
    },

    isUseSublimeText() {
        if (_.isOSX() && _.exists(_.getSublimeTextPath(1))) {
            return true;
        } else {
            return false;
        }
    },
    formatJSONString(data) {
        return JSON.stringify(data, null, 4);
    },
    isAliNetwork() {
        return _.isConnectByUrl('http://svn.simba.taobao.com/');
    },
    isConnectByUrl(url, timeout) {
        return new Promise((resolve, reject) => {
            if (!url) {
                resolve(false);

            } else {
                if (!request) {
                    request = require('superagent');
                }
                request
                    .get(url)
                    .timeout(timeout || 3000)
                    .end((err, ret) => {

                        resolve(!err);
                    });
            };
        });
    },
    noNetworkIsContinue() {
        return new Promise((resolve) => {
            _.isAliNetwork().then((flag) => {
                if (!flag) {
                    if (!inquirer) {
                        inquirer = require('inquirer');
                    }
                    inquirer
                        .prompt([{
                            name: 'noNetwork',
                            message: '没有连接VPN或内网，无法和SVN保持同步，是否继续',
                            type: 'confirm'
                        }])
                        .then((answer) => {

                            resolve({
                                net: flag,
                                'continue': answer.noNetwork
                            });
                        });

                } else {
                    resolve({
                        net: flag,
                        'continue': true
                    });
                }
            });
        });
    },

    template(text, data) {
        return tmpl(text, data);
    },
    md5(data, len) {
        var md5sum = crypto.createHash('md5'),
            encoding = typeof data === 'string' ? 'utf8' : 'binary';

        md5sum.update(data, encoding);
        len = len || 7;
        return md5sum.digest('hex').substring(0, len);
    },
    encrypt(string) {
        let newStr = '';

        for (var i = 0, char; char = string.charCodeAt(i); i++) {
            newStr += String.fromCharCode(char - 1);
        }

        return newStr;
    },

    decrypt(string) {
        let newStr = '';

        for (var i = 0, char; char = string.charCodeAt(i); i++) {
            newStr += String.fromCharCode(char + 1);
        }

        return newStr;
    },
    bigfont(c, opts) {
        let lines = [],
            space,
            prefix,
            suffix;

        if (!bigfont) {
            bigfont = require('bigfont');
        }

        if (!c) {
            return;
        }

        opts = opts || {};
        space = opts.lineStyle < 0 ? ' ' : '';
        prefix = opts.prefix || '';
        suffix = opts.suffix || '';

        c.split('').forEach((text, index) => {
            var colorName = Array.isArray(opts.colors) && opts.colors[index],
                color = colorName in chalk ? chalk[colorName] : chalk['cyan'],
                temp = bigfont.lattice(text, opts);

            temp.split(/\n/).forEach((text, index) => {
                if (!lines[index]) {
                    lines[index] = '';
                }
                if (text) {
                    lines[index] += space + color(text);
                }
            });
        });
        if (prefix || suffix) {
            lines = lines.map((line) => {
                return prefix + line + suffix;
            });
        }
        return lines.join('\n');
    },
    displayLogo() {
        let versions = [],
            B = _.isOSX() ? '▒' : '|';

        versions.push(chalk.red(`${B}${B}${B}${B}   `) + chalk.yellow(`${B}${B}${B}  `) + chalk.red(`${B}${B}${B}${B}   `) + chalk.green(` ${B}${B}${B} `));
        versions.push(chalk.red(`${B}   ${B}  `) + chalk.yellow(` ${B}   `) + chalk.red(`${B}   ${B}  `) + chalk.green(`${B}   ${B}`));
        versions.push(chalk.red(`${B}   ${B}  `) + chalk.yellow(` ${B}   `) + chalk.red(`${B}   ${B}  `) + chalk.green(`${B}   ${B}`));
        versions.push(chalk.red(`${B}${B}${B}${B}   `) + chalk.yellow(` ${B}   `) + chalk.red(`${B}${B}${B}${B}   `) + chalk.green(`${B}   ${B}`));
        versions.push(chalk.red(`${B}   ${B}  `) + chalk.yellow(` ${B}   `) + chalk.red(`${B}   ${B}  `) + chalk.green(`${B}   ${B}`));
        versions.push(chalk.red(`${B}   ${B}  `) + chalk.yellow(` ${B}   `) + chalk.red(`${B}   ${B}  `) + chalk.green(`${B}   ${B}`));
        versions.push(chalk.red(`${B}${B}${B}${B}   `) + chalk.yellow(`${B}${B}${B}  `) + chalk.red(`${B}${B}${B}${B}   `) + chalk.green(` ${B}${B}${B} `));

        return versions.join('\n');
    },
    setEnv(key, v) {
        process.env[key] = v;
    },
    getEnv(key) {
        return process.env[key];
    },
    setVerbose(v) {
        _.setEnv('verbose', v);
    },
    getVerbose() {
        return _.getEnv('verbose') == 'true';
    },
    /**
     * Reference: http://blog.macromates.com/2006/keychain-access-from-shell/
     */
    getOSXKeyChainPassword(opts) {
        return new Promise((resolve) => {
            let execPath = '/usr/bin/security',
                security,
                password = '',
                err;

            opts = opts || {};

            if (!opts.account || !opts.service) {
                err = new Error('account and service is required');
                resolve({
                    err
                });
            } else {
                security = spawn(execPath, ['find-generic-password', '-a', opts.account, '-s', opts.service, '-g']);
                security.stderr.on('data', (d) => {
                    password += d.toString();
                });
                security.stdout.on('close', (code, signal) => {
                    if (code != 0) {
                        err = new Error('Could not find password');
                        resolve({
                            err
                        });
                    } else {
                        if (/password/.test(password)) {
                            password = password.match(/"(.*)\"/, '')[1];
                            resolve({
                                err,
                                password
                            });
                        } else {
                            err = new Error('Could not find password');
                            resolve({
                                err
                            });
                        }
                    }
                });
            }
        });

    }
};

module.exports = _;
