/* jshint node: true  */
/* jshint esnext: true*/
"use strict";

var chalk = require('chalk');
var path  = require('path');

module.exports = {
    error:     chalk.red,
    good:      chalk.green,
    info:      chalk.white,
    warn:      chalk.yellow,
    brand:     chalk.cyan,
    logPre:    chalk.cyan("[Style Guide] "),
    logSpace:  '              ',
    fileList:  false,
    moduleDir: path.dirname(process.mainModule.filename),
    relDir:    path.relative(__dirname, process.cwd()),
    hljsDir:   path.dirname(require.resolve('highlight.js')) //Required for npm3+ compatibility
};
