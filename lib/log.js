var _sg = require('./globals');

var chalk = require('chalk');

/**
 * Generic file list console output
 *
 * @param {String} Arguments
 */
module.exports = function (fileName, create) {

    if (create) {
        var time = getTime();
        return console.info(_sg.logPre + 'Created ' + _sg.good(fileName) + chalk.grey(' ['+time+']'));
    }

    if (_sg.fileList) {
        return console.info(_sg.logPre + 'Reading ' + _sg.info(fileName));
    }

};

function getTime(){
    var time = new Date();
    return time.getHours() +
        ':' + time.getMinutes() +
        ':' + time.getSeconds() +
        ':' + time.getMilliseconds();
}
