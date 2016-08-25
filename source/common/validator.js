'use strict';
const _ = require('./util.js');
const pth = require('path');

const types = {
    email: {
        validate(value) {
            return /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(value);
        },
        message: '输入的邮箱格式不正确'
    },
    url: {
        validate(value) {
            return /^((https?)|(svn)):\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i.test(value);
        },
        message: '输入正确的SVN服务器地址'
    },
    required: {
        validate(value) {
            if (typeof value == 'undefined') {
                return true;
            } else {
                return value != '';
            }
        },
        message: '必填项'
    },
    dir: {
        validate(input) {
            input = input.replace(/^~/, _.getUserDir());
            if (!pth.isAbsolute(input)) {

                input = pth.resolve(process.cwd(), input);
            }
            try {
                if (!_.exists(input)) {
                    _.mkdir(input);
                }
                return true;
            } catch (e) {
                return false;
            }
        }
    }
};

let message;

module.exports = {
    validate(rule, value) {
        let validator;

        message = null;

        validator = rule in types && types[rule];

        if (validator && validator.validate(value)) {
            return true;
        } else {
            message = validator.message || '验证不通过';
            return false;
        }
    },
    addTypes(type, opts) {
        types[type] = opts;
    },
    message() {
        return message;
    }
};
