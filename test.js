"use strict";

var sys = require('util')
var exec = require('child_process').exec;
var path = require('path');

var pathToBin = path.join(process.cwd(), 'node_modules', '.bin')
var pathToBin = path.join(process.cwd(), 'node_modules', '.bin')
var pathName = /^win/.test(process.platform) ? 'Path' : 'PATH'
var newPath = pathToBin + path.delimiter + process.env[pathName]


exec('md_documentation lf', {
        env:{PATH:newPath}
    },
    function(error, stdout, stderr){
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    if (error !== null) {
      console.log(`exec error: ${error}`);
    }
});
