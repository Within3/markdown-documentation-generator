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
        console.error(_sg.logPre + _sg.error('Could not read partial ' + file + " ("+name+")"));
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

    var hashScript   = fs.readFileSync(path.join(_sg.moduleDir, '/template/hash.js'), 'utf8');
    var stickyScript = fs.readFileSync(path.join(_sg.moduleDir, '/template/sticky.js'), 'utf8');
    var utilScript   = fs.readFileSync(path.join(_sg.moduleDir, '/template/utilities.js'), 'utf8');

    // Adding '#styleguide .hljs pre' to highlight css, to override common used styling for 'pre'
    var highlightSource = _sg.highlightSource.replace('.hljs {', '#styleguide .hljs pre, .hljs {');

    handlebars.registerPartial("hash",      hashScript);
    handlebars.registerPartial("sticky",    stickyScript);
    handlebars.registerPartial("utilities", utilScript);
    handlebars.registerPartial("highlight", highlightSource);
    handlebars.registerPartial("theme",     _sg.themeSource);

    var template = handlebars.compile(_sg.templateSource);

    return template(json);
};
