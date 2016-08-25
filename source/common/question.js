'use strict';
let validator = require('./validator.js');

class Question {
    constructor(questiones) {
        this.questiones = questiones || {};
    }

    getItem(key, opts) {
        return this.build(this.questiones[key], opts);
    }

    build(settings, opts) {
        let questiones = [];

        if (!settings) {
            return questiones;
        }

        Object.keys(settings).forEach((key) => {
            let conf = Object.assign({}, settings[key]);

            if ('validator' in conf) {
                conf['validate'] = ((rule) => {
                    return (value) => {
                        if (validator.validate(rule, value)) {
                            return true;
                        } else {
                            return validator.message();
                        }
                    };
                })(conf.validator);

                delete conf.validator;
            }

            conf['name'] = key;
            conf = Object.assign(conf, opts || {});

            questiones.push(conf);
        });

        return questiones;
    }

}

module.exports = Question;
