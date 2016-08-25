/**
 * 目前只读取了Mac的.subversion目录
 */
'use strict';
var _ = require('../common/util.js');
var fs = require('fs');
var url = require('url');

function findOurSvnAuth(p, svn) {
    var content = _.read(p).toString(),
        username,
        host,
        service;

    content.replace(/username\n*[V]{1}\s+\d+\n+([^\s]+)\n+/gmi, (p, v) => {
        username = v;
    });
    content.replace(/\<(((https?)|(svn)):\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*)\>\s*[\w- ]+/gmi, (v, h) => {
        let urls = url.parse(h);

        service = v;
        host = `${urls.protocol}//${urls.hostname}`;
    });
    if (svn.includes(host)) {
        return {
            service,
            username
        };
    } else {
        return false;
    }
}

module.exports = function* (svn) {
    let subversion = `${_.getUserDir()}/.subversion/auth/svn.simple/`;
    let files;
    let ret;
    let keyChain;

    if (_.isOSX() && _.exists(subversion)) {
        files = fs.readdirSync(subversion);
        if (files.length) {
            for (var i = 0, v, p; v = files[i]; i++) {
                p = subversion + v;
                if (_.isFile(p)) {
                    ret = findOurSvnAuth(p, svn);

                    if (ret) {
                        keyChain = yield _.getOSXKeyChainPassword({
                            account: ret.username,
                            service: ret.service
                        });
                        if (!keyChain.err && keyChain.password) {
                            return {
                                username: ret.username,
                                password: keyChain.password
                            };
                        } else {
                            return false;
                        }
                    }
                }
            }
        }
    }

    return false;
};
