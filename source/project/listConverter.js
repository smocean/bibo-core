'use strict';
const Transform = require('stream').Transform;
const _ = require('../common/util.js');
const Immutable = require('immutable');

class ListConverter extends Transform {
    constructor(options) {
        options = options || {};
        options.objectMode = true;
        super(options);
        this.data = Immutable.Map();
    }
    _transform(chunk, encoding, callback) {
        let strs, isFile, result = Immutable.Map(),
            keys = [], lines, line;

        lines = chunk.toString().split('\n');

        for (var j = 0, jlen = lines.length; j < jlen - 2; j++) {
            line = lines[j];
            isFile = !(line.endsWith('/') || line.endsWith('\\'));
            strs = line.split(/[\/]/);
            keys = [];
            for (var i = 0, len = strs.length; i < len; i++) {
                if (strs[i]) {
                    keys.push(strs[i]);
                }
                if (keys.length <= 0 || result.hasIn(keys)) {
                    continue;
                }

                if (!isFile) {
                    result = result.setIn(keys, Immutable.Map());
                } else {
                    if (i == len - 1) {
                        result = result.setIn(keys, 1);
                    } else {
                        result = result.setIn(keys, Immutable.Map());
                    }
                }

            }
        }
        this.data = result;
        callback();
    }

    _flush(cb) {
        this.push(new Buffer(_.formatJSONString(this.data.toJS())));
        cb();
    }

}
module.exports = ListConverter;

