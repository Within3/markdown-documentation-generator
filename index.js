#!/usr/bin/env node

"use strict";

var _v         = require('./lib/variables'); //"Global" variables
var sanitize   = require('./lib/sanitize');
var formatters = require('./lib/md-formats');
var sorting    = require('./lib/sorts');
var template   = require('./lib/templating');
var cheerio    = require('cheerio');
var cssnano    = require('cssnano');
var fs         = require('fs-extra');
var walk       = require('walk');
var markdown   = require('marked');
var chalk      = require('chalk');
var hl         = require('highlight.js');
var path       = require('path');
var _          = require('lodash');

//Default options
var options = {
    sgComment: 'SG',
	devIdentifier: '[[dev]]',
	exampleIdentifier: 'html_example',
    sortCategories: true,
    sections: {
        "styles": '',
        "development": '[[dev]]'
    },
    srcFolder: process.cwd(),
    excludeDirs: ['target', 'node_modules'],
    fileExtensions: {
		scss: true,
		sass: true,
		css: true,
		less: true,
        md: true
	},
    templateFile: path.join(_v.moduleDir, '/template/template.html'),
    themeFile: path.join(_v.moduleDir, '/template/theme.css'),
    outputFile: path.join(process.cwd(), '/styleguide/styleguide.html'),
    jsonOutput: path.join(process.cwd(), '/styleguide/styleguide.json'),
    handlebarsPartials: {
        utilities: path.join(_v.moduleDir, '/template/utilities.js'),
        jquery: path.join(_v.moduleDir, '/template/jquery.js'),
    },
	highlightStyle: 'rainbow',
    highlightFolder: path.join(_v.hljsDir, '../styles/'),
    custom_v: {
        scripts: ['','']
	},
    markedOptions: {
		gfm: true,
		breaks: true
	},
    walkerOptions: {
		followLinks: false
	}
};


//Set up identifiers
_v.sgUniqueIdentifier   = 'md-sg',
_v.developmentTitle     = 'md-development',
_v.developmentIdentifier= _v.sgUniqueIdentifier+'-'+_v.developmentTitle;



//Set up system variables to be defined later
var templateSource,
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
    			console.log(_v.logPre + _v.good('\nAll done!'));
    			console.log(_v.logPre + 'Created configuration file: ' + _v.good(configFilePath));
    		}
    		if(existingConfig !== undefined) {
    			console.log(_v.logPre + error('\nConfiguration file \'.styleguide\' already exists in this directory!'));
    			console.log(_v.logPre + 'Edit that file, or delete it and run \'init\' again if you want to create a new configuration file.');
    		}
    		process.exit(0);
    	}
        else if(curArg === 'lf'){ //Turn on file listing ('reading file')
    		_v.fileList = true;
    	}
        else { // Show help
    		console.log('');
            if (curArg !== 'help'){
                console.log( _v.logPre + curArg + ' not recognized. Showing help instead.');
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
    		console.log('   ' + _v.info('md_documentation') + '         Generate styleguide');
    		console.log('   ' + _v.info('md_documentation init') + '    Create a new configuration file in the current directory');
    		console.log('   ' + _v.info('md_documentation lf') + '      Show "Reading [filename]" console output' );
    		console.log('   ' + _v.info('md_documentation help') + '    Show this');
    		console.log('');
    		console.log('   More help at');
    		console.log('   https://github.com/UWHealth/markdown-documentation-generator');
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
    	console.log(_v.logPre + 'No ".styleguide" configuration file found in current directory, using defaults');
    }
    if (customOptions !== undefined) {
    	try {
    		customOptions = JSON.parse(customOptions);
    	} catch(err) {
    		console.log(error(_v.logPre + 'Found ".styleguide", but could not read - is it valid json?'));
    		console.dir(err);
    		process.exit(1);
    	}

    	if(_v.fileList) {
            console.log(_v.logPre + 'Reading ' + _v.info('.styleguide'));
        }

        options = mergeObjects(options, customOptions);

    }
    // Add walker exclude directories if set
    if(Object.prototype.toString.call(options.excludeDirs) === '[object Array]') {
    	options.walkerOptions.filters = options.excludeDirs;
    }

    /**
     * Read template/theme/highlight files.
     */
    try {
    	_v.templateSource = fs.readFileSync(options.templateFile, 'utf8');
    } catch(err) {
    	console.log(_v.logPre + error('Could not read template file: ' + options.templateFile));
    	process.exit(1);
    }
    try {
    	_v.themeSource = fs.readFileSync(options.themeFile, 'utf8');
    } catch(err) {
    	console.log(_v.logPre + error('Could not read theme file: ' + options.themeFile));
    	process.exit(1);
    }
    try {
    	_v.highlightSource = fs.readFileSync(path.join(options.highlightFolder, options.highlightStyle + '.css'), 'utf8');
    } catch(err) {
    	console.log(_v.logPre + error('Could not read highlight file: ' + path.join(options.highlightFolder, options.highlightStyle + '.css')));
    	process.exit(1);
    }

}

/**
 * Custom renderer for Marked
 */
var renderer = new markdown.Renderer();
//Add custom formatters
renderer = formatters.register(renderer, options);

/**
 * Initialize script
 *
 */
init();

//Set markdown options and
//set renderer to the custom one defined here
options.markedOptions.renderer = renderer;
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

            var regEsp;
            var filePath = './' + path.join(root, _v.info(fileStats.name));

			if (_v.fileList) {
				console.log(_v.logPre + 'Reading file: ' + filePath);
			}

			if (err) {
				console.log(_v.logPre + error('ERROR!'));
				console.dir(err);
				process.exit(1);
			}

            // Use <SG></SG> for markdown files
            if (fileExtension === "md" || fileExtension === "markdown" || fileExtension === "mdown") {
                pattern = new RegExp('\\< ?' + options.sgComment + '>([\\s\\S]*?)\\< ?\\/' + options.sgComment + ' ?\\>', 'gi');
            }
            else {
                pattern = new RegExp('/\\* ?' + options.sgComment + '([\\s\\S]*?)\\*/', 'gi');
            }

			while ((regEsp = pattern.exec(fileContent)) !== null) {
                //If reading anything other than css, create a reference div we'll use later
                var fileLocation = (fileExtension !== "css") ? '<div data-sg-file-location="'+filePath+'"></div>': '';
                //Convert markdown to html
				fileContents.push(markdown(regEsp[1]) + fileLocation);
			}

			next();
		});
	}
    else {
		next();
	}
});

walker.on("errors", function (root, nodeStatsArray, next) {
	console.log(_v.logPre + error('Error'));
	console.dir(nodeStatsArray);
	process.exit(1);
});


//Wrap all comments starting with SG in a section
walker.on("end", function () {
	var json = convertHTMLtoJSON('<div class="sg-section-' + _v.sgUniqueIdentifier + '">\n' + fileContents.join('</div>\n<div class="sg-section-' + _v.sgUniqueIdentifier + '">\n') + '</div>');
	var html = template(json, options);

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
			console.log(_v.logPre + error('Error'));
			console.dir(err);
			process.exit(1);
		}
		console.log(_v.logPre + 'Created file: ' + _v.good(options.outputFile));
	});
}




/**
 * Take HTML and create JSON object to be parsed by Handlebars
 *
 * @param html
 * @returns {Array} json
 */
function convertHTMLtoJSON(html) {
    var sectionNames = [];
    var sectionObject = {};
    var defaultSection;

    for(var name in options.sections) {
        sectionNames.push(name);
        sectionObject[name] = [];

        if (options.sections[name] === '') {
            defaultSection = name;
        }
    }

	var masterData = {
        sections: Object.create(sectionObject),
		menus: [Object.create(sectionObject)],
        colors: {},
		custom_v: options.custom_v
	};

	var error_log = false;
    var categoryIndex = Object.create(sectionObject);
    var catCache = [];
    var idCache = {};

    var $ = cheerio.load(html);
    //Add wrapAll method to cheerio
    cheerioWrapAll($);

	// Loop each section and turn into javascript object
	$('.sg-section-' + _v.sgUniqueIdentifier).each(function (i, elem) {
		var sectionIdentifier = _v.sgUniqueIdentifier;
		var $category = cheerio.load($(this).html());

        var categoryData = {
            catIndex: null,
            currentSection: null,
            section: {},
            category: '',
            fileLocation: $category('[data-sg-file-location]').data('sg-file-location'),
            priority: 98,
			id: '',
            heading: '',
			code: [],
            markup: [],
            comment: ''
		};

		//Check if this section is a development section by checking class
		if($category('h1')[0]){
            var headerText = $category('h1').text();
            for(var sectionName in options.sections){
                var currentIdentifier = options.sections[sectionName];

                if(headerText.indexOf(currentIdentifier) > -1 && currentIdentifier !== ''){
                    categoryData.currentSection = sectionName;
    			}
            }

            if(categoryData.currentSection === null){
                categoryData.currentSection = defaultSection;
            }

		}else{
			var error_addendum = '';

            //If a previous error exists, don't repeat this error
            if (! error_log ) {
				error_addendum = "\n All sections must start with '# Title'.";
			}
			var error_log = _v.info("Warning:")+" A section in '" + categoryData.fileLocation + "' does not have a valid title." + error_addendum;
			console.log(_v.logPre + error_log);
		}

		$category('h1.main-section-' + sectionIdentifier).each(function (i2, elem2) {
			categoryData.category = $(this).text().replace(/^\s+|\s+$/g, '').replace(options.devIdentifier, '');

            if(catCache.indexOf(categoryData.category) < 0) {
                catCache.push(categoryData.category);
            }
		});

		$category('h1.sub-section-' + sectionIdentifier).each(function (i2, elem2) {
			if (i2 > 0){
                //Make sure sub-section headings have a slash
				categoryData.heading += '/ ';
			}
            //Remove dev identifier and extra spaces
			categoryData.heading += $(this).text().replace(/^\s+|\s+$/g, '').replace(options.devIdentifier, '');

		});

        //Store code examples and markup
		$category('code.sg-code-' + _v.sgUniqueIdentifier).each(function (i2, elem2) {
            var categoryCode = $(this).html().replace(/^\s+|\s+$/g, '');
            categoryData.code.push(categoryCode);
            //Run markup through highlight.js
    		categoryData.markup.push(hl.highlight("html", categoryCode).value);
		});

        //Wrap dd/dt inside <dl>s
        $category('dt').each(function (i2, elem2) {
            $(this).nextUntil(":not(dd, dt)").addBack().wrapAll('<dl class="sg-code-meta-block"></dl>');
        });

        if($category('[data-sg-priority]').length > 0) {
            var priorityNumber = $category('[data-sg-priority]').data('sg-priority').trim();
            if ( priorityNumber == 'last') {
                categoryData.priority = 9999;
            }
            else if( priorityNumber == 'first') {
                categoryData.priority = -1;
            }
            else {
                categoryData.priority = Number(priorityNumber);
            }
        }

        //Give category an ID
		categoryData.id = sanitize.makeUrlSafe(categoryData.category  + '-' + categoryData.heading);

        //Remove unnecessary data from core html
        $category('[data-sg-file-location]').remove();
        $category('[data-sg-priority]').remove();
		$category('h1.main-section-' + sectionIdentifier).remove();
		$category('h1.sub-section-' + sectionIdentifier).remove();
		$category('code.sg-code-' + _v.sgUniqueIdentifier).remove();

        //Save sanitized html
        categoryData.comment = $category.html().replace(/^\s+|\s+$/g, '');

        // console.dir(categoryData);
        //Move category data to master
        saveToMaster(categoryData);
	});

    /*
     * Combine repeat categories
     * by checking with the ID cache
     * ---------------------------------
     * ID Cache format:
     * {1: ["development", 5]}
     * {ID:[section, category-index]}
     *
    **/

    function saveToMaster(categoryData) {

        var currentSection = categoryData.currentSection;

        //If the section's ID has already been cached,
        // just append its data to the previous object
        if (idCache.hasOwnProperty(categoryData.id)) {

            //Grab the index
            var currentIndex = idCache[categoryData.id][1];

            //Select the matched section from the masterData
            var selectedSection = masterData.sections[currentSection][currentIndex];

            //Append the new data to the matched section
            selectedSection.markup.push(categoryData.markup);
            selectedSection.comment += categoryData.comment;
            selectedSection.code.push(categoryData.code);
        }
        else {

            //If the section has not been cached, add it to the cache and master data
            categoryData.catIndex = categoryData.catIndex || categoryIndex[currentSection].length;
            //Cache the ID and its index within its section
            idCache[categoryData.id] = [currentSection, categoryData.catIndex];
            categoryData.section[currentSection] = true;

            delete categoryData.catIndex;

            //Append new section to master data
            objectPush(masterData.sections[currentSection], categoryData);

        }
    }

    /*
     * Sort section data
     */

    if(options.sortCategories){
		//Sort Sections
        for(var section in masterData.sections){
            masterData.sections[section] = sorting(masterData.sections[section]);
        }
	}

    function formatMasterData(sectionName, isMenu) {

        var menuObj = [{}];
        var sectionObj = [{}];
        var menuArr = [];
        var sectionArr = [];
        var sectionHeading;

    	masterData.sections[sectionName].forEach(function(section) {
    		if (menuObj[0].hasOwnProperty(section.category) === false) {
    			menuObj[0][section.category] = [];
                sectionObj[0][section.category] = [];
    		}
    		menuObj[0][section.category].push({
                id: section.id,
                name: (section.heading) ? section.heading : section.category
            });
            sectionObj[0][section.category].push(section);
    	});

        Object.keys(menuObj[0]).forEach(function(key) {
    		menuArr.push({
                name: key,
                headings: menuObj[0][key]
            });

            //Remove unnecessary data
            delete sectionObj[0][key].catIndex;

            sectionArr.push({
                name: key,
                id: menuObj[0][key][0].id,
                articles: sectionObj[0][key]
            });
    	});

        return isMenu ? menuArr : sectionArr;
    }

    //Create menu and section JSON



    for(var section in options.sections){
        masterData.menus[0][section] = formatMasterData(section, true);
        masterData.sections[section] = formatMasterData(section, false);
    }

    //Save JSON to file
    if (options.jsonOutput) {
        fs.outputFile(options.jsonOutput, JSON.stringify(masterData, null, '  '), function(err) {
            if(err){
                console.log(_v.logPre + 'Error: Cannot write ' + options.jsonOutput);
                console.error(err);
            }
            else {
                console.log(_v.logPre + 'Created file: ' + _v.good(options.jsonOutput));
            }
        });

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
