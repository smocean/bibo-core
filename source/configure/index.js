'use strict';
const _ = require('../common/util.js');
const Immutable = require('immutable');
const validator = require('../common/validator.js');
const pth = require('path');
const SCSOLUTION = 'smsc';
let properties,
    cmdProperties = {},
    Model = {};
let configure = {
    get: function (key) {
        let tmp, config;

        if (!key) {
            try {
                // node require存在缓存机制，使用require方式读取json时，会造成更新json，而读取不到的问题。
                tmp = require(_.getBiboConfigPath());
                delete require.cache[_.getBiboConfigPath()];
            } catch (e) {
                tmp = {};
            }

            return Immutable.fromJS(tmp);
        } else {
            config = configure.get();
            return Array.isArray(key) ? config.getIn(key) : config.get(key);
        }

    },
    set: function (key, value) {
        let config;

        if (arguments.length >= 2) {
            config = configure.get();
            config = Array.isArray(key) ? config.setIn(key, value) : config.set(key, value);
            configure.set(config);
        } else if (arguments.length == 1) {
            config = Immutable.fromJS(key);
            _.write(_.getBiboConfigPath(), _.formatJSONString(config || configure.get()));
        }
    }
};

properties = {
    needSync: {
        get: () => {
            if (!Model.syncTime || Date.now() - Model.syncTime > 3600000) {
                return true;
            } else {
                return false;
            }
        }
    },
    username: {
        cmdLine: {
            type: 'string',
            describe: '修改SVN用户名'
        }
    },
    password: {
        getHandle: (value) => {
            return _.decrypt(value);
        },
        setHandle: (value) => {
            return _.encrypt(value);
        },
        cmdLine: {
            type: 'string',
            describe: '修改SVN密码'
        }
    },
    author: {
        getHandle: (value) => {
            if (!value) {
                return Model.username;
            }
            return value;
        },
        cmdLine: {
            type: 'string',
            describe: '修改SC作者名'
        }
    },
    email: {
        getHandle: (value) => {
            if (!value) {
                return `${Model.username}@alibaba-inc.com`;
            }
            return value;
        },
        cmdLine: {
            type: 'string',
            describe: '修改Email'
        }
    },
    solution: {
        getHandle: (value) => {
            if (!value) {
                return SCSOLUTION;
            }
            return value;
        }
    },
    isSC: {
        get: () => {
            return Model.solution == SCSOLUTION;
        }
    },
    syncTime: {},
    template: {
        getHandle: (value) => {
            if (!value) {
                value = _.getTemplateDir();
            }
            return value;
        }
    },

    tmplRepo: {
        getHandle: (value) => {
            if (!value) {
                value = 'http://gitlab.alibaba-inc.com/shenma-frontend/bibo-template.git';
            }
            return value;
        }
    },
    workspace: {
        setHandle: (value) => {
            if (value.startsWith('~')) {
                value = value.replace(/^~/, _.getUserDir());
            } else if (!value.startsWith('/') && !value.startsWith('\\')) {
                value = pth.resolve(process.cwd(), value);
            }

            return value;
        },
        getHandle: (value) => {
            if (!value) {
                return process.cwd();
            } else {
                return value;
            }
        },
        validator: 'dir'
    },
    svn: {
        setHandle: (value) => {
            if (!value.endsWith('/')) {
                value += '/';
            }
            return value;
        },
        validator: 'url',
        cmdLine: {
            type: 'string',
            describe: '修改SVN远程仓储'
        }
    },
    model: {
        get: () => {
            return configure.get();
        },
        set: (value) => {

            return configure.set(value);
        }
    }
};
if (_.isUseSublimeText()) {
    Object.assign(properties, {
        IDE: {
            get: () => {
                return _.getSublimeTextPath();
            }
        },
        autoOpenIDE: {
            getHandle: (value) => {
                if (typeof value == 'undefined') {
                    return 0;
                }
                return value;
            }
            // cmdLine: {
            //     type: 'number',
            //     describe: '是否create和update后自动打开IDE(目前仅在MAC中支持sublime)'
            // }
        }
    });
}

function setProperty(key, prop, value, hasSet) {
    if ('setHandle' in prop) {
        value = prop.setHandle(value);
    }
    if (!hasSet) {
        configure.set(key, value);
    } else {
        prop.set(value);
    }
}
function getProperty(key, prop, hasGet) {
    let value;

    if (!hasGet) {
        value = configure.get(key);
    } else {
        value = prop.get();
    }

    if ('getHandle' in prop) {
        value = prop.getHandle(value);
    }
    return value;

}


function addProperties(properties) {

    Object.keys(properties).forEach((key) => {
        let prop = properties[key],
            descriptor,
            hasSet = 'set' in prop,
            hasGet = 'get' in prop,
            isDefineSet = hasSet || !hasGet,
            isDefineGet = hasGet || !hasSet;

        descriptor = {
            configurable: false,
            enumerable: false
        };

        if (isDefineSet) {
            descriptor['set'] = (value) => {
                if ('validator' in prop && prop.validator) {
                    if (validator.validate(prop.validator, value)) {
                        setProperty(key, prop, value, hasSet);
                    } else {
                        _.hint('warn', validator.message());
                    }
                } else {
                    setProperty(key, prop, value, hasSet);
                }
            };
        }
        if (isDefineGet) {
            descriptor['get'] = () => {
                return getProperty(key, prop, hasGet);
            };
        }

        if ('cmdLine' in prop) {
            cmdProperties[key] = prop.cmdLine;
        }

        Object.defineProperty(Model, key, descriptor);
    });
}

addProperties(properties);

Object.assign(Model, {
    getCmdProperties() {
        return cmdProperties;
    },
    testIsSC(name) {
        return name == SCSOLUTION;
    },
    addProperties(properties) {
        addProperties(properties);
    }
});

module.exports = Model;
