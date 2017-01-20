/* jshint node: true  */
/* jshint esversion:6 */
"use strict";

var tags     = require('./tags').tags;
var patterns = require('./tags').patterns;

var hl       = require('highlight.js');


/**
 * Registers new and modified renderers to Marked's renderer
 * @param {object} renderer
 * @param {object} options
 * @returns {object} renderer with added functionality
 */

function customRenderers(renderer, options) {
    /**
     * Converts headings to special main-section/sub-section elements for later placement
     * Processed via convertHTMLtoJSON function
     */
    renderer.heading = function (string, number) {
        if (number === 1) {

            var splitHeader = string.split('/', 2);

            var heading = '<'+tags.category+'>' + splitHeader[0] + '</'+tags.category+'>\n';

            if (splitHeader.length > 1) {
                for (var i = 1; i < splitHeader.length; i++){
                    //Use fake html tag to more easily parse later
                    heading += '<'+tags.article+'>' + splitHeader[i] + '</'+tags.article+'>\n';
                }
            }

            return heading;
        }
        else {
            //Allow for non-mainsection h1's
            number = Math.floor(number);
            var escapedString = string.replace(/<\/?[^>]+(>|$)/g, "").trim().toLowerCase().replace(/[^\w]+/g, '-');
            return `
                <h${number} id="${(options.markedOptions.headerPrefix || '' )}`+
                `${escapedString}" `+
                ` class="sg-heading sg-heading-${number}">${string}</h${number}>\n`;
        }
    };

    /**
     * Checks for example codeblocks
     * and runs all codeblocks through highlight.js
     */
    renderer.code = function (text, lang) {
        //check for html example
        if (lang === options.exampleIdentifier){
            return '\n<'+tags.example+'>' + text + '</'+tags.example+'>\n';
        }
        else {
            var processedText = '';
            const langPrefix = options.markedOptions.langPrefix || " ";

            if (lang) {
                processedText = hl.highlight(lang, text).value;
            }
            else{
                processedText = hl.highlightAuto(text).value;
            }

            return '\n<div class="sg-markup sg-codeblock">' +
                '\n<pre class="sg-markup_wrap">'+
                '<code class="hljs sg-code '+
                langPrefix+'">' +
                processedText +
                '\n</code></pre>'+
                '\n</div>\n';
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
        };

        var classString = " sg-code sg-codespan sg-global",
        test;

        //Run through tests
        for (var check in codeChecks) {
            if ({}.hasOwnProperty.call(codeChecks, check)){
                if((test = codeChecks[check].exec(text))){
                    //Replace double $$ (global variable) with singles
                    var newString = test[0].replace('$$', '$').trim(),
                    //Remove @ (mixin identifier) and parens, replace non-word characters with a dash
                    safeString = newString.replace('@', '')
                        .replace(/[\(\)]/gmi, '')
                        .replace(/[\W\s]/gmi, '-');

                    return '<code id="'+check+'-'+safeString+'"'+
                        ' class="sg-global-'+ check +
                        classString +'" '+
                        ' data-code-id="'+ newString +'">'+
                        newString +
                        '</code>';
                }
            }
        }

        //Just return a standard codespan if none of the previous regExs pass
        return'<code class="sg-code sg-codespan">'+text+'</code>';
    };

    renderer.br = function(){
        //Line breaks required for tag parsing within paragraphs
        return "\n<br>\n";
    };

    renderer.paragraph = function(text) {

        /**
         * Checks paragraphs that contain @returns/@requires/@params/etc. tags.
         * Essentially allowing for meta-data/jsdoc-style documentation.
         * Converts them to definition lists or styleguide-specific html.
         *
         * @param {String} text - paragraph text
         * @returns {String} text - newly formmatted data either surrounded by a custom tag or a dt/dd
         */
        function testForTags(text) {
            //Block "tags"
            let tagTypes = patterns,
            //"Tags" that are specifically used for styleguide formatting
                metaTypes = Object.keys(tags),
                matches;

            function formatTags(type, matches) {

                if(metaTypes.indexOf(type) > -1) {
                    return '<'+tags[type]+'>'+matches[4].trim()+'</'+tags[type]+'>';
                }

                //Convert aliases and requires to codespans so we can use their references
                if (type === "alias" || type === "requires") {
                    matches[4] = renderer.codespan.call(renderer, matches[4]);
                }

                return [
                    '<p data-code-meta="'+matches[3]+'" class="sg-code-meta sg-code-meta-value">',
                        matches[4],
                    '</p>'
                ].join(' ');
            }

            //Run through all types, replacing wherever necessary
            for (var type in tagTypes) {
                if ({}.hasOwnProperty.call(tagTypes, type)) {
                    var tagRegEx = new RegExp("(^)(@)(" + tagTypes[type] + "):?([A-z\\S\\ ]+)$", "mi");

                    if ((matches = text.match(tagRegEx))) {
                        //Send text through formatting and remove unnecessary breaks
                        text = text
                            .replace(matches[0], formatTags(type, matches))
                            .replace('<br>', '');

                    }
                }
            }

            //Wrap un-tagged portions with p tags
            return text.replace(/^(?!(?:<\/?[^>]+>[^>]+<\/?[^>]+>|$))(.*)$/gm, '<p>$&</p>');
        }

        //If a paragraph starts with an "@", test it for tags
        return (text.match(/(^@.+$)/gmi)) ? testForTags(text).replace('<p></p>', '') : '<p>'+text+'</p>';
    };

    return renderer;
}

module.exports.register = function(renderer, options){
    return customRenderers(renderer, options);
};
