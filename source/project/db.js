'use strict';

const _ = require('../common/util.js');
const pth = require('path');
const ListConverter = require('./listConverter.js');
const Immutable = require('immutable');
const fs = require('fs');

const SvnExtend = require('../svn/svnExtend.js');
const svnExtend = new SvnExtend();

class DB {
    constructor() {

        this.DBPATH = pth.join(_.getCurrentBiboConfigDir(), 'db.json');
        this.RAWDBPATH = pth.join(_.getCurrentBiboConfigDir(), 'raw-db.json');
    }

    get Model() {
        let db = this._DB;

        if (!db) {
            try {
                db = require(this.DBPATH);
            } catch (e) {
                db = {};
            }

            this._DB = Immutable.fromJS(db);
        }
        return this._DB;
    }
    set Model(value) {
        var db;

        try {
            db = value.toJS();
            this._DB = value;

            _.write(this.DBPATH, _.formatJSONString(db));
        } catch (e) {

        }
    }

    get _RawModel() {
        let db = this._RawDB;

        if (!db) {
            try {
                db = require(this.RAWDBPATH);
            } catch (e) {
                db = {};
            }

            this._RawDB = Immutable.fromJS(db);
        }
        return this._RawDB;
    }
    set _RawModel(value) {
        var db;

        try {
            db = value.toJS();
            this._RawDB = value;

            _.write(this.RAWDBPATH, _.formatJSONString(db));
        } catch (e) {

        }
    }

    getRawModel() {
        try {
            return this._RawModel.get('mate').toJS();
        } catch (e) {
            return [];
        }
    }

    select(key) {
        return Array.isArray(key) ? this.Model.getIn(key) : this.Model.get(key);
    }

    insert(key, value) {
        this.Model = Array.isArray(key) ? this.Model.setIn(key, value) : this.Model.set(key, value);
    }

    __getList(dirs) {
        return new Promise((resolve, reject) => {
            let promises = [];

            if (dirs) {
                for (let ext in dirs) {
                    promises.push(svnExtend.list({
                        path: ext,
                        depth: dirs[ext].depth,
                        ext: ext
                    }));
                }
            } else {
                promises.push(svnExtend.list({
                    path: '',
                    depth: SvnExtend.DEPTH.INFINITY
                }));
            }
            Promise
                .all(promises)
                .then((stdout) => {

                    resolve(stdout.join('\n'));
                })
                .catch((stdout) => {
                    reject(stdout.join('\n'));
                });
        });
    }

    sync(dirs) {
        let self = this;

        return this
            .__getList(dirs)
            .then((stdout) => {
                _.getVerbose() && _.hint(stdout);
                if (stdout) {
                    let listConverter = new ListConverter();
                    let writeStream = fs.createWriteStream(this.DBPATH);

                    listConverter
                        .pipe(writeStream);
                    listConverter
                        .write(stdout);

                    listConverter.on('finish', function () {
                        self._RawModel = Immutable.fromJS({
                            mate: stdout.split('\n')
                        });
                    });

                    listConverter
                        .end();

                }
            })
            .catch((stdout) => {
                _.hint('error', stdout);
            });
    }
};

module.exports = DB;

