// "use strict";
//
// var sys = require('util')
// var exec = require('child_process').exec;
// var path = require('path');
//
// var pathToBin = path.join(process.cwd(), '../../node_modules', '.bin')
// var pathToBin = path.join(process.cwd(), 'node_modules', '.bin')
// var pathName = /^win/.test(process.platform) ? 'Path' : 'PATH'
// var newPath = pathToBin + path.delimiter + process.env[pathName]
//
// var args = process.argv.slice(2);
//
// exec('md_documentation lf ' + args, {
//         env:{PATH:newPath}
//     },
//     function(error, stdout, stderr){
//     console.log(`stdout: ${stdout}`);
//     console.log(`stderr: ${stderr}`);
//     if (error !== null) {
//       console.log(`exec error: ${error}`);
//     }
// });

var nodemon = require('nodemon');
var config = require('../nodemon-watch.js');

nodemon(config, "ls").on('log', function(event) {
    console.log(event.colour);
});
