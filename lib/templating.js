/* jshint node: true  */
/* jshint esnext: true*/
"use strict";

var _sg        = require('./globals');
var listFiles  = require('./log');

var handlebars = require('handlebars');
var helpers    = require('./swag.js');
var fs         = require('fs-extra');
var path       = require('path');

/**
 * Try user-provided Handlebars partials to ensure they are files that can be read
 *
 * @param {string} file
 * @param {string} name
 * @returns {string} file content
 */
function checkPartial(file, name) {
    try {
        listFiles(_sg.brand('Partial: ') +  path.relative(_sg.root, file), false, 3);
        return fs.readFileSync(file, 'utf8');
    }
    catch(err) {
        console.error(_sg.error(_sg.logPre + 'Could not read ' + name + ' Partial: ' + file));
        return;
    }
}

/**
 * Run through Handlebars to create HTML
 *
 * @param {object} json
 * @returns {string} html
 */
module.exports = function(json, options) {
    //Register Swag helpers
    helpers.registerHelpers(handlebars);

    findPathPartials(_sg.templateSource, options.templateFile);

    //Run through partials, check if they exist, and register them
    for(var partial in options.handlebarsPartials) {
        if ({}.hasOwnProperty.call(options.handlebarsPartials, partial)) {
            checkAndRegisterPartial(
                partial,
                path.resolve(_sg.root, options.handlebarsPartials[partial])
            );
        }
    }

    // Adding '#styleguide .hljs pre' to highlight css, to override common used styling for 'pre'
    // var highlightSource = _sg.highlightSource.replace('.hljs {', '#styleguide .hljs pre, .hljs {');
    handlebars.registerPartial("highlight", _sg.highlightSource);
    handlebars.registerPartial("theme",     _sg.themeSource);

    try {
        var template = handlebars.compile(_sg.templateSource);
        var html = template(json);
        return html;
    } catch(err) {
        console.error(_sg.logPre + _sg.error(new Error("Error compiling template")));
        console.error(err);
        process.exit(1);
    }

};


function findPathPartials(template, templatePath) {
    const regex = /{{>\s*['"]?((\.|\/)[a-zA-Z\/\.\-_]*)['"]? *}}/g;

    let matches;
    let partialsFound = {};
    while((matches = regex.exec(template)) !== null) {
        checkAndRegisterPartial(
            matches[1],
            path.resolve(path.dirname(templatePath), matches[1])
        )
    }
}


function checkAndRegisterPartial(partial, partialPath) {
    const currentPartial = checkPartial(partialPath, partial);
    // Check for nested partials
    findPathPartials(currentPartial, partialPath);
    handlebars.registerPartial(partial, currentPartial);
}
