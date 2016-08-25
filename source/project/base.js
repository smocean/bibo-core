'use strict';
const DB = require('./db.js');
const configure = require('../configure/');
const pth = require('path');
const _ = require('../common/util.js');
const rimraf = require('rimraf');
const SvnExtend = require('../svn/svnExtend.js');
const svn = new SvnExtend();

class Project {

    constructor() {
        this.db = new DB();
    }

    *init() {
        yield * this.initial();
        configure.syncTime = Date.now();
    }

    *sync() {
        if (configure.needSync) {
            yield * this.synchronize();
            configure.syncTime = Date.now();
        }
    }

    *initial() {
        rimraf.sync(pth.join(configure.workspace, '.svn'));
        _.stdout('正在同步数据……');
        yield this.db.sync();
        _.stdout('正在checkout项目');
        yield svn.checkout({
            url: '',
            path: '',
            depth: SvnExtend.DEPTH.INFINITY,
            force: true
        });
        _.stdout('\r\n');
    }
    *synchronize() {
        _.stdout('正在与SVN同步数据');
        yield this.db.sync();
        yield svn.update('', {
            force: true,
            depth: SvnExtend.DEPTH.INFINITY
        });

        _.hint('\r\n');
    }

    existsLocal(path) {
        return _.exists(pth.join(configure.workspace, path));
    }

    removeLocal(path) {
        let _path = pth.join(configure.workspace, path);

        if (this.existsLocal(path)) {
            rimraf.sync(_path);
        }
    }
};

module.exports = Project;

