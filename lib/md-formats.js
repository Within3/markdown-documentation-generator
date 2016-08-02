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


            var out = '<mainsection>' + splitHeader[0] + '</mainsection>\n';

            if (splitHeader.length > 1) {
                for (var i = 1; i < splitHeader.length; i++){
                    //Use fake html tag to more easily parse later
                    out += '<subsection>' + splitHeader[i] + '</subsection>\n';
                }
            }

            return out;
        }
        else {
            //Allow for non-mainsection h1's
            if(number === 1.5){ number = 1 }
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
            var processed_text = "";
            if (lang) {
                processed_text = hl.highlight(lang, text).value;
            }
            else{
                processed_text = hl.highlightAuto(text).value;
            }

            return '\n<div class="sg-markup sg-codeblock">\n<pre class="sg-markup_wrap"><code class="hljs sg-code">' + processed_text + '\n</code></pre></div>\n';
        }
    };

    /**
     * Checks for mixins, variables, and functions
     * Adds classes for better styling control
     */
    renderer.codespan = function(text){
        //Global variable check ($$variable) ($$variable, $$variable)
        var varRE = /\s*(\${2}[A-z\S]+)[,\s\n]?/gi;
        var varCheck = varRE.exec(text);
        //Global function check ( function-name() )
        var fnRE = /(^\s*(?!@)\S+\(\)$)/gmi;
        var fnCheck = fnRE.exec(text);
        //Global mixin check ( @mixin-name() )
        var mixinRE = /\s*(@\S+\(\)$)/gi;
        var mixinCheck = mixinRE.exec(text);

        var classString = " sg-code sg-codespan sg-global";

        var output = '';
        var modifiedString = '';

        if (varCheck !== null) {
            modifiedString = varCheck[0].replace('$$', '$');
            var idString = modifiedString.replace(/\$/gmi, '')
                .replace(/[\W\s]/gmi, '-');

            output = '<code id="var-'+idString+'" class="global_variable'+classString+'" data-code-id="'+idString+'">'+modifiedString+'</code>';


        }
        else if (fnCheck !== null){
            modifiedString = fnCheck[0].replace(/[\(\)]/gmi, '')
                .replace(/[\W\s]/gmi, '-');

            output = '<code id="fn-'+text+'" class="global_function'+classString+'" data-code-id="'+modifiedString+'">'+text+'</code>';

        }
        else if (mixinCheck !== null){
            modifiedString = mixinCheck[0].replace('@', '')
                .replace(/[\(\)]/gmi, '')
                .replace(/[\W\s]/gmi, '-');

            output = '<code id="mixin-'+modifiedString+'" class="global_mixin'+classString+'" data-code-id="'+modifiedString+'">'+text+'</code>';

        }
        else {
            output = '<code class="sg-code sg-codespan">'+text+'</code>';
        }

        return output;
    }


    renderer.br = function(){
        return "\n<br>\n";
    }

    /**
     * Checks paragraphs that contain @returns/@requires/@params/etc.
     * Essentially allowing for meta data within the
     * Allows for jsdoc-style documentation styles
     * Converts them to definition lists
     */
    renderer.paragraph = function(text) {

        //Types to check for
        var baseTypes = {
            requires: "requires|require|req",
            returns: "returns|return|ret",
            alias: "alias|aliases",
            param: "parameter|param|arg|argument",
            links: "source|reference|ref|link",
            file: "file|files",
            priority: "priority|order",
            section: "section"
        };

        function runTypeTest(text) {
            var currentType, baseRegEx, matches;

            for (var i in baseTypes) {
                currentType = baseTypes[i];
                baseRegEx = new RegExp("(^)(@)(" + currentType + "):?([A-z\\S\\ ]+)$", "mi");

                if ((matches = text.match(baseRegEx))) {

                    text = text.replace(matches[0], function(){
                        if (i === "alias" || i === "requires") {

                            return [
                                '<dt class="sg-'+matches[3]+' sg-code-meta sg-code-meta-type">',
                                    matches[3],
                                '</span>',
                                '<dd class="sg-'+matches[3]+' sg-code-meta sg-code-meta-value">',
                                    '<span class="sg-codespan sg-code-example" data-code-tag="'+matches[3]+'">',
                                        renderer.codespan.call(renderer, matches[4]),
                                    '</span>',
                                '</dd>'
                            ].join('');

                        }
                        //Use fake html tags to more easily parse later
                        else if(i == "file") {
                            return '<filelocation>'+matches[4]+'</filelocation>';
                        }
                        else if(i == "priority") {
                            return '<priority>'+matches[4]+'</priority>';
                        }
                        else if(i == "section") {
                            return '<sectionmark>'+matches[4]+'</sectionmark>';
                        }

                        return [
                            '<dt class="sg-'+matches[3]+' sg-code-meta sg-code-meta-type">',
                                matches[3],
                            '</span>',
                            '<dd class="sg-'+matches[3]+' sg-code-meta sg-code-meta-value">',
                                '<code class="sg-codespan sg-code-example" data-code-tag="'+matches[3]+'">',
                                    matches[4],
                                '</code>',
                            '</dd>'
                        ].join('');
                    });
                }
            }
            return text;
        }

        text = runTypeTest(text);

        return "<p>" + text + "</p>\n";
    }

    return renderer;
}

module.exports = {register};
