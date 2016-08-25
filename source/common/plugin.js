'use strict';
var shell = require('shelljs');
var configure = require('../configure/');
var _ = require('./util.js');
var pth = require('path');

module.exports = {
    loadSyncSolution() {
        return new Promise((resolve, reject) => {
            var solution = configure.solution,
                name = `bibo-sync-${solution}`;

            try {
                resolve(this._loadSS(name));
            } catch (e) {
                try {
                    resolve(require(name));
                } catch (e1) {
                    try {
                        // 安装插件或依赖
                        this.install(name);

                        resolve(this._loadSS(name));
                    } catch (e2) {
                        reject(new Error('load [' + name + '] error : ' + e2.message));
                    }
                }

            }
        });

    },
    _loadSS(name) {
        return require(pth.join(_.getBiboPluginDir(), 'node_modules', name));
    },
    install: function (name) {
        var dir = _.getBiboPluginDir(),
            cwd = process.cwd();

        shell.cd(dir);
        shell.exec('npm install ' + name);
        shell.cd(cwd);
    }

};

