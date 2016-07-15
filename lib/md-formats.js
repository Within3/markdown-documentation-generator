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
    		var header = string.split('/', 2);
    		var sectionIdentifier = _v.sgUniqueIdentifier;

    		var out = '<h1 class="sg-heading main-section-' + sectionIdentifier + '">' + header[0] + '</h1>\n';

    		if (header.length > 1) {
    			for (var i = 1; i < header.length; i++){
    				out += '<h1 class="sg-heading sub-section-' + sectionIdentifier + '">' + header[i] + '</h1>\n';
    			}
    		}
            else {
    			out += '<h1 class="sg-heading sub-section-' + sectionIdentifier + '"></h1>\n';
    		}

    		return out;
    	}
        else {
            var sanitizedId = sanitize.makeSafeForCSS(string);
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
    		return '\n<code class="sg-code sg-code-example sg-codeblock sg-code-' + _v.sgUniqueIdentifier + '">\n' + text + '\n</code>\n';
    	}
        else {
    		var processed_text = "";
    		if (lang) {
    			processed_text = hl.highlight(lang, text).value;
    		}
            else{
    			processed_text = hl.highlightAuto(text).value;
    		}

    		return '\n<div class="sg-markup">\n<pre class="sg-markup_wrap"><code class="hljs sg-code sg-codeblock">' + processed_text + '\n</code></pre></div>\n';
    	}
    };

    /**
     * Checks for mixins, variables, and functions
     * Adds classes for better styling control
     */
    renderer.codespan = function(text){
        //Global variable check ($$variable) ($$variable, $$variable)
    	var varRE = /\s*(\${2}[A-z\S]+)[,\s\n]?/gi;
    	var var_check = varRE.exec(text);
        //Global function check ( function-name() )
    	var fnRE = /(^\s*(?!@)\S+\(\)$)/gmi;
    	var fn_check = fnRE.exec(text);
        //Global mixin check ( @mixin-name() )
    	var mixinRE = /\s*(@\S+\(\)$)/gi;
    	var mixin_check = mixinRE.exec(text);

        var classString = " sg-code sg-codespan sg-global ";

    	var output = '';
    	var modifiedString = '';

    	if ( var_check !== null){
    		modifiedString = var_check[0].replace('$$', '$');
            var idString = modifiedString.replace(/\$/gmi, '')
                .replace(/[\W\s]/gmi, '-');

    		output = '<code id="var-'+idString+'" class="global_variable'+classString+'" data-code-id="'+idString+'">'+modifiedString+'</code>';


    	}
        else if (fn_check !== null){
            modifiedString = fn_check[0].replace(/[\(\)]/gmi, '')
                .replace(/[\W\s]/gmi, '-');

            output = '<code id="fn-'+text+'" class="global_function'+classString+'" data-code-id="'+modifiedString+'">'+text+'</code>';

    	}
        else if (mixin_check !== null){
    		modifiedString = mixin_check[0].replace('@', '')
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
            param: "parameter|param",
            links: "source|reference|ref|link",
            file: "file|files",
            priority: "priority|order"
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
                        else if(i == "file") {
                            return '<div data-sg-file-location="'+matches[4]+'"></div>';
                        }
                        else if(i == "priority") {
                            return '<div data-sg-priority="'+matches[4]+'"></div>';
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
