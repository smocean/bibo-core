'use strict';
const svn = require('./svnInterface.js');
const _ = require('../common/util.js');
const configure = require('../configure/');
const pth = require('path');
const SVNConfig = require('./svnConfig.js');
const auth = require('./auth.js');

const stream = require('stream');

let lock = false;

class ProcessStream extends stream.Transform {
    constructor() {
        super();
        this.data = [];
    }
    _transform(chunk, encoding, callback) {
        let str = chunk.toString('utf8').split(/\n/);

        this.push(new Buffer(JSON.stringify(str)));
        callback();
    }
}

let pStream = new ProcessStream();

pStream.on('readable', function () {
    var obj;

    if (null != (obj = pStream.read()) && !lock) {
        lock = true;
        JSON.parse(obj).forEach((v) => {
            _.stdout(v);
        });

        lock = false;
    }
});

function processCb(err, stdout) {

    if (!err) {
        if (stdout) {
            pStream.write(stdout);
        }
    } else {
        _.hint('error', stdout);
    }
}

function addPathPrefix(path) {
    if (!path.includes(configure.workspace)) {
        return pth.join(configure.workspace, path);
    }
    return path;
}

function getPathList(path) {
    var pathList = [];

    if (!Array.isArray(path)) {
        pathList.push(addPathPrefix(path));
    } else {
        path.forEach((v) => {
            pathList.push(addPathPrefix(v));
        });
    }
    return pathList;
}

class SvnExtend {
    constructor() {

    }

    get verbose() {
        return _.getVerbose();
    }

    getSvnOpts(opts) {
        var _opts = {
            username: configure.username,
            password: configure.password
        };

        return Object.assign(opts || {}, _opts);
    }

    list(opts, cb) {
        var url = configure.svn + opts.path,
            ext = opts.ext,
            depth = opts.depth || SVNConfig.DEPTH.IMMEDIATES,
            self = this;

        return new Promise((resolve, reject) => {
            svn.ls(url, self.getSvnOpts({
                depth: depth,
                xml: false
            }), () => {
                return {
                    cb: (err, stdout) => {
                        _.stdout('\n\r');
                        if (!err) {
                            if (ext) {
                                stdout = `${ext}/${stdout}`;
                                stdout = stdout.split('\n').join(`\n${ext}/`);
                            } else {
                            //     stdout = stdout.split('\n');
                            }
                            resolve(stdout);
                        } else {
                            reject(stdout);
                        }
                    }
                };
            });
        });
    }

    checkout(opts) {
        var self = this,
            url = opts.url,
            path = opts.path,
            depth = opts.depth || SVNConfig.DEPTH.INFINITY,
            force = opts.force;

        return new Promise((resolve, reject) => {
            var ws = pth.join(configure.workspace, path);

            url = configure.svn + url;

            svn.co(url, ws, self.getSvnOpts({
                depth: depth || _.SVNDepth.INFINITY,
                force: force || false
            }), () => {
                return {
                    cb: (err, stdout) => {

                        self.verbose && _.hint(stdout);
                        resolve(!err);
                    },
                    process: processCb
                };
            });
        });
    }
    update(path, opts, cb) {
        var self = this;

        return new Promise((resolve, reject) => {
            var url = pth.join(configure.workspace, path);

            opts = Object.assign({
                accept: 'postpone'
            }, opts);

            opts = self.getSvnOpts(opts);
            svn.up(url, opts, () => {
                return {
                    cb: (err, stdout) => {

                        self.verbose && _.hint(stdout);

                        if (err) {
                            svn.cleanup(configure.workspace, self.getSvnOpts(), () => {
                                return {
                                    cb: (err, stdout) => {
                                        resolve({
                                            code: 0,
                                            stdout: stdout
                                        });
                                    }
                                };
                            });
                        } else {
                            if (stdout.indexOf('Summary of conflicts') >= 0) {
                                resolve({
                                    code: 2,
                                    stdout: stdout
                                });
                            } else {
                                resolve({
                                    code: 1,
                                    stdout: stdout
                                });
                            }

                        }
                    },
                    process: processCb
                };
            });
        });
    }

    add(path, opts) {
        let self = this;

        return new Promise((resolve, reject) => {
            let _path = getPathList(path),
                _opts = {
                    force: true,
                    depth: SVNConfig.DEPTH.INFINITY
                };

            opts = Object.assign(opts || {}, _opts);

            svn.add(_path, self.getSvnOpts(opts), () => {
                return {
                    cb: (err, stdout) => {
                        _.stdout('\r');
                        self.verbose && _.hint(stdout);
                        resolve(err);
                    }
                };
            });
        });
    }

    status(path, opts) {
        let self = this;

        return new Promise((resolve) => {
            let _path = pth.join(configure.workspace, path),
                _opts = {
                    xml: false,
                    depth: SVNConfig.DEPTH.INFINITY
                };

            svn.st(_path, self.getSvnOpts(Object.assign(opts || {}, _opts)), () => {
                return {
                    cb: (err, stdout) => {
                        _.stdout('\r');
                        self.verbose && _.hint(stdout);
                        resolve({
                            err,
                            stdout
                        });
                    }
                };
            });

        });
    }

    commit(path, opts) {
        let self = this;

        return new Promise((resolve, reject) => {
            let _path = getPathList(path),
                _opts = {
                    message: 'bibo自动提交'
                };

            opts = Object.assign(_opts, opts);

            // svn.ci(_path, self.getSvnOpts(opts), () => {
            //     return {
            //         cb: (err, stdout) => {
            //             _.stdout('\r');
            //             self.verbose && _.hint(stdout);
            //             resolve(!err);
            //         },
            //         process: processCb
            //     };
            // });

            self.add(path, self.getSvnOpts()).then((err) => {
                if (!err) {
                    svn.ci(_path, self.getSvnOpts(opts), () => {
                        return {
                            cb: (err, stdout) => {
                                _.stdout('\r');
                                self.verbose && _.hint(stdout);
                                resolve(!err);
                            },
                            process: processCb
                        };
                    });
                } else {
                    resolve(!err);
                }
            });
        });
    }

    resolve(path, opts) {
        let self = this;

        return new Promise((resolve, reject) => {
            let _path = pth.join(configure.workspace, path),
                _opts = {
                    depth: SVNConfig.DEPTH.INFINITY
                };

            opts = Object.assign(_opts, opts);

            svn.resolve(_path, self.getSvnOpts(opts), () => {
                return {
                    cb: (err, stdout) => {
                        _.stdout('\r');
                        self.verbose && _.hint(stdout);
                        resolve(!err);
                    },
                    process: processCb
                };
            });
        });
    }

    resolved(path) {
        let self = this;

        return new Promise((resolve, reject) => {
            let _path = pth.join(configure.workspace, path),
                opts = {
                    depth: SVNConfig.DEPTH.INFINITY
                };

            svn.resolved(_path, self.getSvnOpts(opts), () => {
                return {
                    cb: (err, stdout) => {
                        _.stdout('\r');
                        self.verbose && _.hint(stdout);

                        resolve(!err);
                    },
                    process: processCb
                };
            });
        });
    }

}

Object.setPrototypeOf(SvnExtend, svn);
Object.setPrototypeOf(SvnExtend, SVNConfig);
SvnExtend.auth = auth;

module.exports = SvnExtend;


