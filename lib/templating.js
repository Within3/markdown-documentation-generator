var _sg        = require('./globals');

var handlebars = require('handlebars');
var helpers    = require('swag');
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
        file = fs.readFileSync(file, 'utf8');
    }
    catch(err) {
        console.error(_sg.error(_sg.logPre + 'Could not read ' + name + ' Partial: ' + file));
        return;
    }

    return file;
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

    for(var partial in options.handlebarsPartials) {
        if ({}.hasOwnProperty.call(options.handlebarsPartials, partial)) {
            var currentPartial = checkPartial(options.handlebarsPartials[partial], partial);
            handlebars.registerPartial(partial, currentPartial);
        }
    }

    // Adding '#styleguide .hljs pre' to highlight css, to override common used styling for 'pre'
    var highlightSource = _sg.highlightSource.replace('.hljs {', '#styleguide .hljs pre, .hljs {');
    handlebars.registerPartial("highlight", highlightSource);
    handlebars.registerPartial("theme",     _sg.themeSource);

    var template = handlebars.compile(_sg.templateSource);

    try {
        var html = template(json);
        return html;
    }catch(err) {
        console.error(_sg.logPre + _sg.error("Error compiling template"));
        console.error(err);
        process.exit(1);
    }

};
