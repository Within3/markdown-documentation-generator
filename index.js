#!/usr/bin/env node

"use strict";

var sanitize = require('./lib/sanitize');
var handlebars = require('handlebars');
var cheerio = require('cheerio');
var fs = require('fs-extra');
var walk = require('walk');
var markdown = require('marked');
var chalk = require('chalk');
var hl = require('highlight.js');
var path = require('path');
var helpers = require('swag');
var _ = require('cheerio/node_modules/lodash');

var error = chalk.bold.red;
var good = chalk.green;
var info = chalk.yellow;
var logPre = chalk.cyan("[Style Guide] ");
var fileList = false;


//Grab this file's directory
var moduleDir = path.dirname(process.mainModule.filename);

//Default options
var options = {
	sgComment: 'SG',
	devIdentifier: '[[dev]]',
	exampleIdentifier: 'html_example',
	highlightStyle: 'zenburn',
	excludeDirs: ['target', 'node_modules'],
	sortSections: true,
	fileExtensions: {
		scss: true,
		sass: true,
		css: true,
		less: true
	},
    customVars: {
        scripts: ['','and/here']
	},
    markedOptions: {
		gfm: true,
		breaks: true
	},
    srcFolder: process.cwd(),
	outputFile: path.join(process.cwd(), '/styleguide/styleguide.html'),
    jsonOutput: path.join(process.cwd(), '/styleguide/styleguide.json'),
	templateFile: path.join(moduleDir, '/template/template.html'),
	themeFile: path.join(moduleDir, '/template/theme.css'),
	highlightFolder: path.join(moduleDir, '/node_modules/highlight.js/styles'),
	walkerOptions: {
		followLinks: false
	},
	jqFile: path.join(moduleDir, '/template/jquery.js')
};

//Identifiers for classes
var sgUniqueIdentifier = 'md-sg';
var developmentTitle = 'development';
var developmentIdentifier = sgUniqueIdentifier+'-'+developmentTitle;

//Set up system variables to be defined later
var templateSource,
    highlightSource,
    themeSource,
    jqSource,
    customOptions,
    configFilePath,
    existingConfig,
    walker;

function init() {
    //Get CLI arguments
    var args = process.argv.slice(2);

    if(args.length > 0) {
    	var curArg = args[0].toLowerCase();

        if(curArg === 'init') { // Let user create a new configuration file.
    		configFilePath = path.join(process.cwd(), '.styleguide');

    		try {
    			existingConfig = fs.readFileSync(configFilePath, 'utf8');
    		} catch(err) {
    			fs.writeFileSync(configFilePath, JSON.stringify(options,null,'\t'));
    			console.log(logPre + good('\nAll done!'));
    			console.log(logPre + 'Created configuration file: ' + good(configFilePath));
    		}
    		if(existingConfig !== undefined) {
    			console.log(logPre + error('\nConfiguration file \'.styleguide\' already exists in this directory!'));
    			console.log(logPre + 'Edit that file, or delete it and run \'init\' again if you want to create a new configuration file.');
    		}
    		process.exit(0);
    	} else if(curArg === 'lf'){ //Turn off file listing
    		fileList = true;
    	} else { // Show help
    		console.log('');
            if (curArg !== 'help'){
                console.log( logPre + curArg + ' not recognized. Showing help instead.');
            }
    		console.log(chalk.blue('     _____ _         _                  _     _      '));
    		console.log(chalk.blue('    / ____| |       | |                (_)   | |     '));
    		console.log(chalk.blue('   | (___ | |_ _   _| | ___  __ _ _   _ _  __| | ___ '));
    		console.log(chalk.blue('    \\___ \\| __| | | | |/ _ \\/ _` | | | | |/ _` |/ _ \\'));
    		console.log(chalk.blue('    ____) | |_| |_| | |  __/ (_| | |_| | | (_| |  __/'));
    		console.log(chalk.blue('   |_____/ \\__|\\__, |_|\\___|\\__, |\\__,_|_|\\__,_|\\___|'));
    		console.log(chalk.blue('                __/ |        __/ |                   '));
    		console.log(chalk.blue('               |___/        |___/                    '));
    		console.log('');
    		console.log('   ' + info('md_documentation') + '         Generate styleguide');
    		console.log('   ' + info('md_documentation init') + '    Create a new configuration file in the current directory');
    		console.log('   ' + info('md_documentation lf') + '      Show "reading [filename]" console output' );
    		console.log('   ' + info('md_documentation help') + '    Show this');
    		console.log('');
    		console.log('      More help at');
    		console.log('      https://github.com/UWHealth/markdown-documentation-generator');
    		console.log('');
    		process.exit(0);
    	}
    }

    /**
     * Read configuration
     */
    try {
    	customOptions = fs.readFileSync('.styleguide', 'utf8');
    } catch(err) {
    	console.log(logPre + 'No ".styleguide" configuration file found in current directory, using defaults');
    }
    if (customOptions !== undefined) {
    	try {
    		customOptions = JSON.parse(customOptions);
    	} catch(err) {
    		console.log(error(logPre + 'Found ".styleguide", but could not read - is it valid json?'));
    		console.dir(err);
    		process.exit(1);
    	}
    	console.log(logPre + good('Reading ') + info('.styleguide'));

        options = mergeObjects(options, customOptions);
    }
    // Add walker exclude directories if set
    if(Object.prototype.toString.call(options.excludeDirs) === '[object Array]') {
    	options.walkerOptions.filters = options.excludeDirs;
    }

    /**
     * Read template/them files.
     */
    try {
    	templateSource = fs.readFileSync(options.templateFile, 'utf8');
    } catch(err) {
    	console.log(logPre + error('Could not read template file: ' + options.templateFile));
    	process.exit(1);
    }
    try {
    	highlightSource = fs.readFileSync(path.join(options.highlightFolder, options.highlightStyle + '.css'), 'utf8');
    } catch(err) {
    	console.log(logPre + error('Could not read highlight file: ' + path.join(options.highlightFolder, options.highlightStyle + '.css')));
    	process.exit(1);
    }
    try {
    	themeSource = fs.readFileSync(options.themeFile, 'utf8');
    } catch(err) {
    	console.log(logPre + error('Could not read theme file: ' + options.themeFile));
    	process.exit(1);
    }
    try {
    	jqSource = fs.readFileSync(options.jqFile, 'utf8');
    } catch(err) {
    	console.log(logPre + error('Could not read jquery file: ' + options.jqFile));
    	process.exit(1);
    }
}


/**
 * Custom renderer for Marked
 *
 */
var renderer = new markdown.Renderer();


/**
 * Converts headings to special main-section/sub-section classes for later placement
 */
renderer.heading = function (string, number) {
	if (number === 1) {
		var header = string.split('/', 2);
		var sectionIdentifier = sgUniqueIdentifier;

		//Check for the devIdentifier
		//Returns false or the position of the devIdentifier in the array
		var checkForDev = function(heading){
			if (heading.indexOf(options.devIdentifier) > -1 ||
				heading[0].indexOf(options.devIdentifier) > -1){
				return 0;
			}else if (heading[(heading.length-1)].indexOf(options.devIdentifier) > -1){
				return (heading.length-1);
			}else{
				return false;
			}
		};

		var check_dev = checkForDev(header);

		if ( check_dev !== false ) {
			//Change the section class name to dev so we can identify it later
			sectionIdentifier = developmentIdentifier;
			//Remove the devIdentifier from the string
			header[check_dev] = header[check_dev].replace(' '+options.devIdentifier, '');
			header[check_dev] = header[check_dev].replace(options.devIdentifier, '');
		}

		var out = '<h1 class="main-section-' + sectionIdentifier + '">' + header[0] + '</h1>\n';

		if (header.length > 1) {
			for (var i = 1; i < header.length; i++){
				out += '<h1 class="sub-section-' + sectionIdentifier + '">' + header[i] + '</h1>\n';
			}
		} else {
			out += '<h1 class="sub-section-' + sectionIdentifier + '"></h1>\n';
		}

		return out;
	} else {
        var sanitizedId = sanitize.makeSafeForCSS(string);
        sanitizedId = sanitizedId.replace(/[\(\)]/gmi, '')
                .replace('@', '')
                .replace('$', '')
                .replace(/[\W\s]/gmi, '-')
                .toLowerCase();

		return '<h' + number + ' class="sg-heading main-section-' + sgUniqueIdentifier + ' ' + sanitizedId + '" id="heading-' + sanitizedId + '">' + string + '</h' + number + '>\n';
	}
};

renderer.code = function (text, lang) {
    //check for html example
	if (lang === options.exampleIdentifier){
		return '\n<code class="sg-code sg-code-example sg-codeblock sg-code-' + sgUniqueIdentifier + '">\n' + text + '\n</code>\n';
	}else {
		var processed_text = "";
		if (lang) {
			processed_text = hl.highlight(lang, text).value;
		}else{
			processed_text = hl.highlightAuto(text).value;
		}
		return '\n<div class="sg-markup hljs">\n<pre class="sg-markup_wrap"><code class="sg-code sg-codeblock">' + processed_text + '\n</code></pre></div>\n';
	}
};

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

	var output = '';
	var modifiedString = '';

	if ( var_check !== null){
		modifiedString = var_check[0].replace('$$', '$');
        var idString = modifiedString.replace(/\$/gmi, '')
            .replace(/[\W\s]/gmi, '-');

		output = '<code id="var-'+idString+'" class="sg-codespan global global_variable" data-code-id="'+idString+'">'+modifiedString+'</code>';


	}else if (fn_check !== null){
        modifiedString = fn_check[0].replace(/[\(\)]/gmi, '')
            .replace(/[\W\s]/gmi, '-');

        output = '<code id="fn-'+text+'" class="sg-code sg-codespan global global_function" data-code-id="'+modifiedString+'">'+text+'</code>';

	}else if (mixin_check !== null){
		modifiedString = mixin_check[0].replace('@', '')
            .replace(/[\(\)]/gmi, '')
            .replace(/[\W\s]/gmi, '-');

		output = '<code id="mixin-'+modifiedString+'" class="sg-code sg-codespan global global_mixin" data-code-id="'+modifiedString+'">'+text+'</code>';

	}else {
		output = '<code class="sg-code sg-codespan">'+text+'</code>';
	}

	return output;
}


renderer.br = function(){
    return "\n<br>\n";
}

renderer.paragraph = function(text) {
    //search for paragraphs containing @returns/@requires/@params
    var baseTypes = {
        requires: "requires|require|req",
        returns: "returns|return|ret",
        alias: "alias|aliases",
        param: "parameter|param",
        links: "source|reference|ref|link",
        file: "file | files"
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

                    }else if(i == "file") {
                        return '<div data-sg-file-location="'+matches[4]+'"></div>';

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

/**
 * Initialize script
 *
 */

init();


//Set renderer to the custom one defined here
options.markedOptions.renderer = renderer;

//Set marked options
markdown.setOptions(options.markedOptions);

/**
 * Walk the file tree
 */
walker = walk.walk(options.srcFolder, options.walkerOptions);

/**
 * Read valid files (default: scss/css), get the Styleguide comments and put into an array
 */
var fileContents = [],
    pattern;

walker.on("file", function (root, fileStats, next) {
	var fileExtension = fileStats.name.substr((~-fileStats.name.lastIndexOf(".") >>> 0) + 2).toLowerCase();

    if (options.fileExtensions[fileExtension]) {
		fs.readFile(path.join(root, fileStats.name), 'utf8', function (err, fileContent) {

            var regResp;
            var filePath = './' + path.join(root, info(fileStats.name));

			if (fileList) {
				console.log(logPre + 'Reading file: ' + filePath);
			}

			if (err) {
				console.log(logPre + error('ERROR!'));
				console.dir(err);
				process.exit(1);
			}

            // Use <SG></SG> for markdown files
            if (fileExtension === "md" || fileExtension === "markdown" || fileExtension === "mdown") {
                pattern = new RegExp('\\< ?' + options.sgComment + '>([\\s\\S]*?)\\< ?\\/' + options.sgComment + ' ?\\>', 'gi');
            }else {
                pattern = new RegExp('/\\* ?' + options.sgComment + '([\\s\\S]*?)\\*/', 'gi');
            }

			while ((regResp = pattern.exec(fileContent)) !== null) {
                //Convert markdown to html and append file's name and path
                var fileLocation = (fileExtension !== "css") ? '<div data-sg-file-location="'+filePath+'"></div>': '<div></div>';
				fileContents.push(markdown(regResp[1]) + fileLocation);
			}
			next();
		});
	} else {
		next();
	}
});

walker.on("errors", function (root, nodeStatsArray, next) {
	console.log(logPre + error('Error'));
	console.dir(nodeStatsArray);
	process.exit(1);
});


//Wrap all comments starting with SG in a section
walker.on("end", function () {
	var json = convertHTMLtoJSON('<div class="sg-section-' + sgUniqueIdentifier + '">\n' + fileContents.join('</div>\n<div class="sg-section-' + sgUniqueIdentifier + '">\n') + '</div>');
	var html = doTemplating(json);

	saveFile(html, json);
});

/**
 * Save html to file
 *
 * @param html
 */
function saveFile(html, json) {
	fs.outputFile(options.outputFile, html, function(err, data) {
		if (err) {
			console.log(logPre + error('ERROR!'));
			console.dir(err);
			process.exit(1);
		}
		console.log(logPre + 'Created file: ' + good(options.outputFile));
	});
    fs.outputFile
}

/**
 * Run through Handlebars to create HTML
 *
 * @param {object} json
 * @returns {string} html
 */
function doTemplating(json) {
	helpers.registerHelpers(handlebars);
    var hashScript = fs.readFileSync(path.join(moduleDir, '/template/hash.js'), 'utf8');
    var stickyScript = fs.readFileSync(path.join(moduleDir, '/template/sticky.js'), 'utf8');
    var utilScript = fs.readFileSync(path.join(moduleDir, '/template/utilities.js'), 'utf8');

    // Adding '#styleguide .hljs pre' to highlight css, to override common used styling for 'pre'
	highlightSource = highlightSource.replace('.hljs {', '#styleguide .hljs pre, .hljs {');

	handlebars.registerPartial("jquery", '<script>' + jqSource+ '</script>');
    handlebars.registerPartial("hash", '<script>' + hashScript + '</script>');
    handlebars.registerPartial("sticky", '<script>' + stickyScript + '</script>');
    handlebars.registerPartial("utilities", '<script>' + utilScript + '</script>');
	handlebars.registerPartial("theme", '<style>\n' + themeSource + '\n</style>');
	handlebars.registerPartial("highlight", '<style>\n' + highlightSource + '\n</style>');

	var template = handlebars.compile(templateSource);
	return template(json);
}

/**
 * Take HTML and create JSON object to be parsed by Handlebars
 *
 * @param html
 * @returns {Array} json
 */
function convertHTMLtoJSON(html) {
	var sectionNames = options.sectionTitles;
	var masterData = {
        sections: {
    		styles: [],
            development: [],
        },
		menus: [{
			styles: [],
			development: []
		}],
        colors: {},
		customVars: options.customVars
	};

    var idCache = {};

	var $ = cheerio.load(html);
	var error_log = false;
    var categoryIndex = 0;
    var devCategoryIndex = 0;
    var subCatIndex = 0;
    var catCache = [];

    //Add wrapAll method to cheerio
    cheerioWrapAll($);

	// Loop each section and turn into javascript object
	$('.sg-section-' + sgUniqueIdentifier).each(function (i, elem) {
		var sectionIdentifier = sgUniqueIdentifier;
		var $category = cheerio.load($(this).html());

        var categoryData = {
            catIndex: null,
            subCatIndex: 0,
            category: '',
			id: '',
            heading: '',
			code: [],
            markup: [],
            comment: '',
			codeLang: '',
            isDevelopment: false,
            fileLocation: $category('[data-sg-file-location]').data('sg-file-location'),
			globalVars: []
		};

		//Check if this section is a development section by checking class
		if($category('h1')[0]){
			if($category('h1')[0].attribs.class == 'main-section-'+developmentIdentifier){
				sectionIdentifier = developmentIdentifier;
				categoryData.isDevelopment = true;
			}
		}else{
			var error_addendum = '';

            //If a previous error exists, don't repeat this error
            if (! error_log ) {
				error_addendum = "\n All sections must start with '# Title'."
			}
			var error_log = info("Warning:")+" A section in '" + categoryData.fileLocation + "' does not have a valid title." + error_addendum;
			console.log(logPre + error_log);
		}

		$category('h1.main-section-' + sectionIdentifier).each(function (i2, elem2) {
			categoryData.category = $(this).text().replace(/^\s+|\s+$/g, '').replace(options.devIdentifier, '');

            if(catCache.indexOf(categoryData.category) < 0) {
                catCache.push(categoryData.category);
                subCatIndex = 0;
            }
		});

		$category('h1.sub-section-' + sectionIdentifier).each(function (i2, elem2) {
			if (i2 > 0){
                //Make sure sub-section headings have a slash
				categoryData.heading += '/ ';
			}
            //Remove dev identifier and extra spaces
			categoryData.heading += $(this).text().replace(/^\s+|\s+$/g, '').replace(options.devIdentifier, '');
            subCatIndex++;

			if (this.children.length > 0) {
                categoryData.subCatIndex = subCatIndex;
			}

		});

        //Store code examples and markup
		$category('code.sg-code-' + sgUniqueIdentifier).each(function (i2, elem2) {
            var categoryCode = $(this).html().replace(/^\s+|\s+$/g, '')
            categoryData.code.push(categoryCode);
            //Run markup through highlight.js
    		categoryData.markup.push(hl.highlight("html", categoryCode).value);
		});

        //Store global variables
		$category('code.global_variable').each(function (i2, elem2) {
			categoryData.globalVars.push($(this).text());
		});

        //Wrap dd/dt inside <dl>s
        $category('dt').each(function (i2, elem2) {
            $(this).nextUntil(":not(dd, dt)").addBack().wrapAll('<dl class="sg-code-meta-block"></dl>');
        });

        //Give category an ID
		categoryData.id = sanitize.makeUrlSafe(categoryData.category  + '-' + categoryData.heading);

        //Remove unnecessary data from core html
        $category('[data-sg-file-location]').remove();
		$category('h1.main-section-' + sectionIdentifier).remove();
		$category('h1.sub-section-' + sectionIdentifier).remove();
		$category('code.sg-code-' + sgUniqueIdentifier).remove();

        //Save sanitized html
        categoryData.comment = $category.html().replace(/^\s+|\s+$/g, '');

        //Move category data to master
        saveToMaster(categoryData);
	});

    function saveToMaster(categoryData) {

        /*
         *  Combine repeat categories
         *  by checking with the ID cache
         * ---------------------------------
         * ID Cache format:
         * {1: ["development", 5]}
         * {ID:[section, category-index]}
         *
        **/

        //If the section's ID has already been cached,
        // just append its data to the previous object
        if (idCache.hasOwnProperty(categoryData.id)) {
            //Grab the index
            var categoryIndex = idCache[categoryData.id];

            //Select the matched section from the masterData
            var selectedSection = masterData.sections[categoryIndex[0]][categoryIndex[1]];

            //Append the new data to the matched section
            selectedSection.markup += categoryData.markup;
            selectedSection.comment += categoryData.comment;
            selectedSection.code += categoryData.code;
            selectedSection.globalVars.push(categoryData.globalVars);

        }else {
            //If the section has not been cached, add it to the cache and master data

            if (categoryData.isDevelopment){
                categoryData.catIndex = categoryData.catIndex || devCategoryIndex;
                devCategoryIndex += 1;
                //Cache the ID and its index within its section
                idCache[categoryData.id] = ["development", categoryData.catIndex];

                //Append new section to master data
                objectPush(masterData.sections.development, categoryData);

    		}else {
                categoryData.catIndex = categoryData.catIndex || categoryIndex;
                categoryIndex += 1;
                //Cache the ID and its index within its section
                idCache[categoryData.id] = ["sections", categoryData.catIndex];

                //Append new section to master data
                objectPush(masterData.sections.styles, categoryData);
    		}
        }
    }

	function sorting(a, b) {
		if (a.category === b.category) {
			if (a.heading > b.heading) {
				return 1;
			}
			if (a.heading < b.heading) {
				return -1;
			}
			return 0;
		} else {
			if (a.category > b.category) {
				return 1;
			}
			if (a.category < b.category) {
				return -1;
			}
			return 0;
		}
	};

	if(options.sortSections){
		//Sort Main Sections
		masterData.sections.styles.sort(function(a,b){
			return sorting(a,b);
		});
		//Sort Developer Sections
		masterData.sections.development.sort(function(a,b){
			return sorting(a,b);
		});
	}


    function formatMasterData(sectionName, isMenu) {

        var menuObj = [{}];
        var sectionObj = [{}];
        var menuArr = [];
        var sectionArr = [];
        var sectionHeading;

    	masterData.sections[sectionName].forEach(function(section) {
    		if (!menuObj[0].hasOwnProperty(section.category)) {
    			menuObj[0][section.category] = [];
                sectionObj[0][section.category] = [];
    		}
    		sectionHeading = (section.heading) ? section.heading : section.category;
    		menuObj[0][section.category].push({id: section.id, name:sectionHeading});
            sectionObj[0][section.category].push(section);
    	});

        Object.keys(menuObj[0]).forEach(function(key) {
    		menuArr.push({name: key, headings: menuObj[0][key]});
            sectionArr.push({name: key, id: menuObj[0][key][0]['id'], articles: sectionObj[0][key]});
    	});

        return isMenu ? menuArr : sectionArr;
    }

    //Create menu JSON
	masterData.menus[0].styles = formatMasterData('styles', true);
	masterData.menus[0].development = formatMasterData('development', true);
    //Reformat section JSON (wraps articles in categories)
    masterData.sections.styles = formatMasterData('styles', false);
    masterData.sections.development = formatMasterData('development', false);

    //Save JSON to file
    if (options.jsonOutput) {
        fs.writeFileSync(options.jsonOutput, JSON.stringify(masterData, null, '  '));
        console.log(logPre + 'Created file: ' + good(options.jsonOutput));
    }

	return masterData;
}

/**
 * Merge Objects
 */
function mergeObjects(obj1, obj2) {
	for (var p in obj2) {
		try {
			if ( obj2[p].constructor == Object ) {
				obj1[p] = mergeObjects(obj1[p], obj2[p]);
			} else {
				obj1[p] = obj2[p];
			}
		} catch(e) {
			obj1[p] = obj2[p];
		}
	}
	return obj1;
}

/**
 * Allow Objects to to use array-like push
 */
function objectPush(obj, elem) {
    [].push.call(obj, elem);
}

/**
 * Add wrapAll functionality to cheerio
 */
function cheerioWrapAll($) {
    _.extend($.prototype, {
        wrapAll: function(wrapper) {
            if (this.length < 1) {
                return this;
            }

            if (this.length < 2 && this.wrap) { // wrap not defined in npm version,
                return this.wrap(wrapper);      // and git version fails testing.
            }

            var elems = this;
            var section = $(wrapper);
            var marker = $('<div>');
            marker = marker.insertBefore(elems.first()); // in jQuery marker would remain current
            elems.each(function(k, v) {                  // in Cheerio, we update with the output.
                section.append($(v));
            });
            section.insertBefore(marker);
            marker.remove();
            return section;                 // This is what jQuery would return, IIRC.
        },
    });
}
