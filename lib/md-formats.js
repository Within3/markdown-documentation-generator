var sanitize = require('./sanitize');
var hl       = require('highlight.js');
var _v       = require('./variables');


/**
 * Registers new and modified renderers to Marked's renderer
 * @param {object} renderer
 * @param {object} options
 * @returns {object} renderer with added functionality
 */

function register(renderer, options) {
    /**
     * Converts headings to special main-section/sub-section classes for later placement
     */
    renderer.heading = function (string, number) {
        if (number === 1) {
            var splitHeader = string.split(/\/(?!\\\/|<\/)/gmi, 2);
            var sectionIdentifier = _v.sgUniqueIdentifier;

            var out = '<category>' + splitHeader[0] + '</category>\n';

            if (splitHeader.length > 1) {
                for (var i = 1; i < splitHeader.length; i++){
                    //Use fake html tag to more easily parse later
                    out += '<category-article>' + splitHeader[i] + '</category-article>\n';
                }
            }

            return out;
        }
        else {
            //Allow for non-mainsection h1's
            number = Math.floor(number);

            var sanitizedId = encodeURI(string).toLowerCase().replace(/[^\w%]+/g, '-');
            sanitizedId = sanitizedId.replace(/[\(\)]/gmi, '')
                    .replace('@', '')
                    .replace('$', '')
                    .replace(/[\W\s]/gmi, '-')
                    .toLowerCase();

            return '<h' + number + ' class="sg-heading sg-heading-'+ number +'" id="heading-' + sanitizedId + '">' + string + '</h' + number + '>\n';
        }
    };

    /**
     * Checks for example codeblocks
     * and runs all codeblocks through highlight.js
     */
    renderer.code = function (text, lang) {
        //check for html example
        if (lang === options.exampleIdentifier){
            //Use fake html tag to more easily parse later
            return '\n<examplecode>' + text + '</examplecode>\n';
        }
        else {
            var processedText = '';

            if (lang) {
                processedText = hl.highlight(lang, text).value;
            }
            else{
                processedText = hl.highlightAuto(text).value;
            }

            return '\n<div class="sg-markup sg-codeblock">\n<pre class="sg-markup_wrap"><code class="hljs sg-code">' + processedText + '\n</code></pre></div>\n';
        }
    };

    /**
     * Checks for mixins, variables, and functions
     * Adds classes for better styling control
     */
    renderer.codespan = function(text){

        var codeChecks = {
            "variable": /\s*(\${2}[A-z\S]+)[,\s\n]?/gi,
            "function": /(^\s*(?!@)\S+\(\)$)/gmi,
            "mixin": /\s*(@\S+\(\)$)/gi
        }
        var classString = " sg-code sg-codespan sg-global";

        //Run through tests
        for (var type in codeChecks) {
            var test = codeChecks[type].exec(text);

            if (test !== null){
                var newString = test[0].replace('$$', '$').trim();
                var safeString = newString.replace('@', '')
                    .replace(/[\(\)]/gmi, '')
                    .replace(/[\W\s]/gmi, '-');

                return '<code id="'+type+'-'+safeString+'" class="global-'+type+classString+'" data-code-id="'+newString+'">'+newString+'</code>';
            }
        }

        return'<code class="sg-code sg-codespan">'+text+'</code>';

    }


    renderer.br = function(){
        return "\n<br>\n";  //Allows for simpler tag parsing
    }

    /**
     * Checks paragraphs that contain @returns/@requires/@params/etc.
     * Essentially allowing for meta data within the
     * Allows for jsdoc-style documentation styles
     * Converts them to definition lists
     */
    renderer.paragraph = function(text) {

        function testForTags(text) {
            //Block "tags"
            var tagTypes = {
                requires: "requires|require|req",
                returns: "returns|return|ret",
                alias: "alias|aliases",
                param: "parameter|param|arg|argument",
                links: "source|reference|ref|link",
                filelocation: "file|files",
                priority: "priority|order",
                sectionmark: "section"
            };
            //"Tags" that are only used for styleguide formatting
            var metaTypes = ["filelocation", "priority", "sectionmark"];

            var matches, tagRegEx, type;

            function formatTags(type, matches) {

                if(metaTypes.indexOf(type) > -1) {
                    return '<'+type+'>'+matches[4].trim()+'</'+type+'>';
                }

                //Convert aliases and requires to codespans so we can use their references
                if (type === "alias" || type === "requires") {
                    matches[4] = renderer.codespan.call(renderer, matches[4]);
                }

                return [
                    '<dt class="sg-'+matches[3]+' sg-code-meta sg-code-meta-type">',
                        matches[3],
                    '</dt>',
                    '<dd class="sg-'+matches[3]+' sg-code-meta sg-code-meta-value">',
                        '<span data-code-tag="'+matches[3]+'">',
                            matches[4],
                        '</span>',
                    '</dd>'
                ].join('\n');
            }

            //Run through all types, replacing wherever necessary
            for (type in tagTypes) {
                if ({}.hasOwnProperty.call(tagTypes, type)){
                    tagRegEx = new RegExp("(^)(@)(" + tagTypes[type] + "):?([A-z\\S\\ ]+)$", "mi");

                    if ((matches = text.match(tagRegEx))) {
                        text = text.replace(matches[0], formatTags(type, matches)).replace('<br>', '');
                    }
                }
            }

            return text;
        }
        //If a paragraph starts with an "@", test it for tags
        return (text.match(/(^@.+$)/gmi)) ? testForTags(text) : '<p>'+text+'</p>';
    }

    return renderer;
}

module.exports = {register};
