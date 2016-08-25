'use strict';
const plugin = require('../common/plugin.js');
const _ = require('../common/util.js');
const configure = require('../configure/');
const pth = require('path');
const shell = require('shelljs');

let projects = {
    smbase: require('./base.js'),
    *plugin(flag) {
        let pluginRet = yield plugin.loadSyncSolution();

        if (pluginRet instanceof Error) {
            _.hint('error', pluginRet.message);
            process.exit();
        } else {
            if (flag) {
                yield * pluginRet.sync();
            } else {
                yield * pluginRet.init();
            }
        };
        return pluginRet;
    },
    *loadPlugin() {
        let pluginRet = yield plugin.loadSyncSolution();

        if (pluginRet instanceof Error) {
            _.hint('error', pluginRet.message);
            process.exit();
        }
        return pluginRet;
    },
    get name() {
        return configure.solution;
    },

    get isSC() {
        return configure.isSC;
    },
    *createInstance() {
        var currentSolution = this.name,
            pro;

        if (currentSolution in this) {
            pro = this[currentSolution];
        } else {
            pro = yield this.loadPlugin();
        }

        pro.isSC = this.isSC;

        return pro;
    },
    openIDE(url, force) {
        let IDECmd = configure.IDE,
            path = configure.workspace;

        if (!IDECmd) {
            return;
        }

        if (url) {
            path = pth.join(path, url);

            if (!_.exists(path)) {
                return;
            }
        }

        if (!force && !configure.autoOpenIDE) {
            return;
        }

        return shell.exec(`${IDECmd} -a ${path}`, {silent: true});
    }
};

module.exports = projects;
