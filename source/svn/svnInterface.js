/**
 * 参考https://github.com/dapuck/node-svn-interface/blob/master/svn.js
 * 修改回调函数，加入process
 */

'use strict';

const xml2js = require('xml2js');
const spawn = require('child_process').spawn;
const path = require('path');

var command = 'svn';

process.setMaxListeners(0);

/**
 * This is a dummy function for the features
 * I have not impelmented yet.
 */
function NOTDONE() {
    throw 'Not implemented.';
}

/**
 * Most function take 3 arguments
 * working copy (wc) or files: (String|Array)
 *   Required.
 * options: (Object)
 *   Required for some functions
 * callback (cb): (Function)
 *   Optional. Receives (error, result)
 */

function add(files, options, cb) {
    let opt = {};

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;

    opt = Object.assign(opt, options);
    return _execSVN('add', files, opt, cb);
}

function blame(files, options, cb) {
    let opt = {
        xml: true
    };

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    opt = Object.assign(opt, options);
    return _execSVN('blame', files, opt, cb);
}

function cat(files, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    return _execSVN('cat', files, options, cb);
}

function changelist(files, name, options, cb) {
    // needs to handle change-list name
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    options[name] = true;
    return _execSVN('cl', files, options, cb);
}

function checkout(url, path, options, cb) {
    let files;

    // debugger;
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    // options[url] = true;
    // options[path] = (!path) ? options.cwd : path;
    files = [url];
    files.push((!path) ? options.cwd : path);
    return _execSVN('co', files, options, cb);
}

function cleanup(wc, options, cb) {
    return _execSVN('cleanup', wc, options, cb);
}

function commit(files, options, cb) {
    return _execSVN('ci', files, options, cb);
}

function copy(src, dest, options, cb) {
    return _execSVN('cp', [src, dest], options, cb);
}

function svnDelete(files, options, cb) {
    return _execSVN('rm', files, options, cb);
}

function diff(files, options, cb) {
    let opt;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    opt = {
        xml: true
    };
    opt = Object.assign(opt, options);
    return _execSVN('di', files, opt, cb);
}

function svnExport(files, options, cb) {
    return _execSVN('export', files, options, cb);
}

function svnImport(files, options, cb) {
    return _execSVN('import', files, options, cb);
}

function info(files, options, cb) {
    let opt;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    opt = {
        xml: true
    };
    opt = Object.assign(opt, options);
    return _execSVN('info', files, opt, cb);
}

function list(files, options, cb) {
    let opt;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    opt = {
        xml: true
    };
    opt = Object.assign(opt, options);
    return _execSVN('list', files, opt, cb);
}

function lock(files, options, cb) {
    return _execSVN('lock', files, options, cb);
}

function log(files, options, cb) {
    let opt;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    opt = {
        xml: true
    };
    opt = Object.assign(opt, options);
    return _execSVN('log', files, opt, cb);
}

function merge(src, target, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    target = (!target) ? options.cwd : target;
    target = (!target) ? '' : target;
    if (src.split) {
        src = src.split(' ');
    }
    src.push(target);
    return _execSVN('merge', src, options, cb);
}

function mergeinfo(src, target, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    target = (!target) ? options.cwd : target;
    target = (!target) ? '' : target;
    if (src.split) {
        src = src.split(' ');
    }
    src.push(target);
    return _execSVN('mergeinfo', src, options, cb);
}

function mkdir(files, options, cb) {
    return _execSVN('mkdir', files, options, cb);
}

function move(src, dest, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    dest = (!dest) ? options.cwd : dest;
    dest = (!dest) ? '' : dest;
    if (src.split) {
        src = src.split(' ');
    }
    src.push(dest);
    return _execSVN('move', src, options, cb);
}

function status(files, options, cb) {
    let opt;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = (!options) ? {} : options;
    opt = {
        xml: true
    };
    opt = Object.assign(opt, options);
    return _execSVN('st', files, opt, cb);
}

function svnSwitch(files, options, cb) {
    return _execSVN('sw', files, options, cb);
}

function patch(file, wc, options, cb) {
    return _execSVN('patch', [file, wc], options, cb);
}

function revert(files, options, cb) {
    return _execSVN('revert', files, options, cb);
}

function resolve(files, options, cb) {
    return _execSVN('resolve', files, options, cb);
}
function resolved(files, opts, cb) {
    return _execSVN('resolved', files, opts, cb);
}
function update(files, options, cb) {
    return _execSVN('update', files, options, cb);
}

function _execSVN(cmd, files, options, cb) {
    let args;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    cb = (!cb) ? function empty() {
        return {
            cb: function () {},
            process: function () {}
        };
    } : cb;
    options = (!options) ? {} : options;
    files = _fixFiles(files, options);
    delete options.cwd;
    args = _getArgs(options);
    args.unshift(cmd);
    args = args.concat(files);
    return _process(args, cb);
}

function _process(args, cb) {
    let stdout = '',
        stderr = '',
        child,
        cbObj = cb();

    // console.log(command, args);
    child = spawn(command, args);
    child.stdout.on('data', function appendData(data) {
        var out = data.toString();

        stdout += out;
        typeof cbObj.process == 'function' && cbObj.process(null, out);
    });
    child.stderr.on('data', function appendData(data) {
        var out = data.toString();

        stderr += out;
        typeof cbObj.process == 'function' && cbObj.process(true, out);
    });

    function parentExit(code, sig) {
        if (child.connected) {
            child.kill(sig);
        }
    }
    process.on('exit', parentExit);

    child.on('close', function childExit(code, sig) {
        process.removeListener('exit', parentExit);
        if (stderr.length === 0) {
            if (args.indexOf('--xml') > -1) {
                xml2js.parseString(stdout, {
                    attrkey: '_attribute',
                    charkey: '_text',
                    explicitCharkey: true,
                    explicitArray: false
                },
                function parse(err, result) {
                    cbObj.cb(null, result);
                });
            } else {
                cbObj.cb(null, stdout);
            }
        } else {
            cbObj.cb(code, stderr);
        }
    });
    return child;
}

function _getArgs(options) {
    let args = [],
        val;

    for (var key in options) {
        if (options[key]) {
            if (key.length > 1) {
                args.push('--' + key);
            } else {
                args.push('-' + key);
            }
            if (options[key] !== true) {
                val = (options[key].join) ? options[key].join(',') : options[key];
                args.push(val);
            }
        }
    }
    return args;
}

function _fixFiles(files, options) {
    if (files.split) {
        files = files.split(' ');
    }
    if (options.cwd) {
        // for each file get absolute path
        for (var i = 0; i < files.length; i++) {
            if (!/:\/\//.test(files[i])) {
                files[i] = path.resolve(options.cwd, files[i]);
            }
        }
    }
    return files;
}

function _setCommand(newCommand) {
    command = newCommand;
}

let svn = { // Long names
    add: add,
    blame: blame,
    cat: cat,
    changelist: changelist,
    checkout: checkout,
    cleanup: cleanup,
    commit: commit,
    copy: copy,
    'delete': svnDelete,
    diff: diff,
    'export': svnExport,
    'import': svnImport,
    info: info,
    list: list,
    lock: lock,
    log: log,
    merge: merge,
    mergeinfo: mergeinfo,
    mkdir: mkdir,
    move: move,
    patch: patch,
    propdel: NOTDONE,
    propedit: NOTDONE,
    propget: NOTDONE,
    proplist: NOTDONE,
    propset: NOTDONE,
    relocate: NOTDONE,
    resolve: resolve,
    resolved: resolved,
    revert: revert,
    status: status,
    'switch': svnSwitch,
    unlock: NOTDONE,
    update: update,
    upgrade: NOTDONE,
    _execSVN: _execSVN,
    _setCommand: _setCommand
};

// Aliases
svn.praise = svn.annotate = svn.ann = svn.blame;
svn.cl = svn.changelist;
svn.co = svn.checkout;
svn.ci = svn.commit;
svn.cp = svn.copy;
svn.del = svn.remove = svn.rm = svn['delete'];
svn.di = svn.diff;
svn.ls = svn.list;
svn.mv = svn.rename = svn.ren = svn.move;
svn.pdel = svn.pd = svn.propdel;
svn.pedit = svn.pe = svn.propedit;
svn.pget = svn.pg = svn.propget;
svn.plist = svn.pl = svn.proplist;
svn.pset = svn.ps = svn.propset;
svn.stat = svn.st = svn.status;
svn.sw = svn['switch'];
svn.up = svn.update;

module.exports = svn;
