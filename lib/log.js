/* jshint node: true  */
/* jshint esnext: true*/
"use strict";

var _sg =   require('./globals');

var chalk = require('chalk');

/**
 * Generic file list console output
 *
 * @param {String} Arguments
 */
module.exports = function (fileName, create, level) {

    if (create && canShowLog(level || 2)) {
        var time = getTime();
        return console.info(_sg.logPre, 'Created ' + _sg.good(fileName) + chalk.grey(' ['+time+']'));
    }

    if (_sg.fileList || canShowLog(3)) {
        return console.info(_sg.logPre, 'Reading ' + _sg.info(fileName));
    }

};

module.exports.generic = function(message, level, includeTime) {
    const time = includeTime ? chalk.grey(' [' + getTime() + ']') : '';
    if (canShowLog(level)) {
        return console.info(_sg.logPre, message, time);
    }
}

function canShowLog(level) {
    const levels = {
        "silent": 0,
        "minimal": 1,
        "default": 2,
        "verbose": 3
    }

    const userLevel = levels[_sg.logLevel] || 2;

    return level <= userLevel;
}

function getTime() {
    var time = new Date();
    return time.getHours() +
        ':' + time.getMinutes() +
        ':' + time.getSeconds() +
        ':' + time.getMilliseconds();
}
