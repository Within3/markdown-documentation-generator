var _v         = require('./variables');
var handlebars = require('handlebars');
var helpers    = require('swag');
var fs         = require('fs-extra');
var path       = require('path');

/**
 * Run through Handlebars to create HTML
 *
 * @param {object} json
 * @returns {string} html
 */
module.exports = function(json, options) {
	helpers.registerHelpers(handlebars);

    for(var partial in options.handlebarsPartials) {
        var currentPartial = checkPartial(options.handlebarsPartials[partial], partial);
        handlebars.registerPartial(partial, currentPartial);
    }

    var hashScript   = fs.readFileSync(path.join(_v.moduleDir, '/template/hash.js'), 'utf8');
    var stickyScript = fs.readFileSync(path.join(_v.moduleDir, '/template/sticky.js'), 'utf8');
    var utilScript   = fs.readFileSync(path.join(_v.moduleDir, '/template/utilities.js'), 'utf8');

    // Adding '#styleguide .hljs pre' to highlight css, to override common used styling for 'pre'
	var highlightSource = _v.highlightSource.replace('.hljs {', '#styleguide .hljs pre, .hljs {');

    handlebars.registerPartial("hash",      hashScript);
    handlebars.registerPartial("sticky",    stickyScript);
    handlebars.registerPartial("utilities", utilScript);
    handlebars.registerPartial("highlight", highlightSource);
    handlebars.registerPartial("theme",     _v.themeSource);

    var template = handlebars.compile(_v.templateSource);

    return template(json);
}

/**
 * Try user-provided Handlebars partials to ensure they are files that can be read
 *
 * @param {string} file
 * @param {string} name
 * @returns {string} file content
 */
function checkPartial(file, name) {
    try {
        if(_v.fileList){ console.log(_v.logPre + "Reading partial: "  + file + " ("+name+")") }
    	file = fs.readFileSync(file, 'utf8');
    } catch(err) {
    	console.log(_v.logPre + _v.error('Could not read partial' + file + " ("+name+")"));
        return undefined;
    }

    return file;
}
