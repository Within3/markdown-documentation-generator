var chalk = require('chalk');
var path  = require('path');

module.exports = {
    error:     chalk.bold.red,
    good:      chalk.green,
    info:      chalk.yellow,
    logPre:    chalk.cyan("[Style Guide] "),
    fileList:  false,
    moduleDir: path.dirname(process.mainModule.filename),
    hljsDir:   path.dirname(require.resolve('highlight.js')) //Required for npm3+ compatibility
}
