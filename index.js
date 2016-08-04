#!/usr/bin/env node

"use strict";

var _v         = require('./lib/variables'); //"Global" variables
var sanitize   = require('./lib/sanitize');
var formatters = require('./lib/md-formats');
var sorting    = require('./lib/sorts');
var template   = require('./lib/templating');
var masterData = require('./lib/data-store');
var cheerio    = require('cheerio');
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
    exampleIdentifier: 'html_example',
    sortCategories: true,
    sections: {
        "styles": '',
        "development": 'Dev:'
    },
    srcFolder: process.cwd(),
    excludeDirs: ['target', 'node_modules'],
    fileExtensions: {
        scss: true,
        sass: true,
        css: false,
        less: true,
        md: true
    },
    templateFile: path.join(_v.moduleDir, '/template/template.html'),
    themeFile: path.join(_v.moduleDir, '/template/theme.css'),
    outputFile: path.join(process.cwd(), '/styleguide/styleguide.html'),
    jsonOutput: false,
    handlebarsPartials: {
        utilities: path.join(_v.moduleDir, '/template/utilities.js'),
        jquery: path.join(_v.moduleDir, '/template/jquery.js'),
    },
    highlightStyle: 'arduino-light',
    highlightFolder: path.join(_v.hljsDir, '../styles/'),
    customVariables: {
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
_v.sgUniqueIdentifier   = 'md-sg';

//Set up system variables to be defined later
var templateSource,
    themeSource,
    jqSource,
    customOptions,
    configFilePath,
    existingConfig,
    walker,
    renderer;

/**
 * Generic file list console output
 *
 * @param {String} Arguments
 */
function listFiles(fileName) {
    if(_v.fileList){
        console.info(_v.logPre + 'Reading ' + _v.info(fileName));
    }
}

/**
 * Initialize
 *
 * @param {Array} arguments
 */
function readArgs(args) {

    if (args.length > 0) {
        var curArg = args[0].toLowerCase();

        if(curArg === 'init') { // Let user create a new configuration file.
            configFilePath = path.join(process.cwd(), '.styleguide');

            try {
                existingConfig = fs.readFileSync(configFilePath, 'utf8');
            } catch(err) {
                fs.writeFileSync(configFilePath, JSON.stringify(options,null,'\t'));
                console.info(_v.logPre + _v.good('\nAll done!'));
                console.info(_v.logPre + 'Created configuration file: ' + _v.good(configFilePath));
            }
            if (existingConfig !== undefined) {
                console.error(_v.logPre + _v.error('\nConfiguration file \'.styleguide\' already exists in this directory!'));
                console.warn(_v.logPre + 'Edit that file, or delete it and run \'init\' again if you want to create a new configuration file.');
            }
            process.exit(0);
        }
        else if (curArg === 'lf'){ //Turn on file listing ('reading file')
            _v.fileList = true;
        }
        else { // Show help
            console.info('');
            if (curArg !== 'help'){
                console.info( _v.logPre + curArg + ' not recognized. Showing help instead.');
            }
            console.info(chalk.blue('     _____ _         _                  _     _      '));
            console.info(chalk.blue('    / ____| |       | |                (_)   | |     '));
            console.info(chalk.blue('   | (___ | |_ _   _| | ___  __ _ _   _ _  __| | ___ '));
            console.info(chalk.blue('    \\___ \\| __| | | | |/ _ \\/ _` | | | | |/ _` |/ _ \\'));
            console.info(chalk.blue('    ____) | |_| |_| | |  __/ (_| | |_| | | (_| |  __/'));
            console.info(chalk.blue('   |_____/ \\__|\\__, |_|\\___|\\__, |\\__,_|_|\\__,_|\\___|'));
            console.info(chalk.blue('                __/ |        __/ |                   '));
            console.info(chalk.blue('               |___/        |___/                    '));
            console.info('');
            console.info('   ' + _v.info('md_documentation') + '         Generate styleguide');
            console.info('   ' + _v.info('md_documentation init') + '    Create a new configuration file in the current directory');
            console.info('   ' + _v.info('md_documentation lf') + '      Show "Reading [filename]" console output' );
            console.info('   ' + _v.info('md_documentation help') + '    Show this');
            console.info('');
            console.info('   More help at');
            console.info('   https://github.com/UWHealth/markdown-documentation-generator');
            console.info('');
            process.exit(0);
        }
    }

}

/**
 * Read configuration
 */

function readConfig() {
    try {
        customOptions = fs.readFileSync('.styleguide', 'utf8');
    } catch(err) {
        console.info(_v.logPre + 'No ".styleguide" configuration file found in current directory, using defaults');
    }
    if (customOptions !== undefined) {
        try {
            listFiles('.styleguide');
            customOptions = JSON.parse(customOptions);
        }
        catch(err) {
            console.info(_v.error(_v.logPre + 'Found ".styleguide", but could not read - is it valid json?'));
            console.error(err);
            process.exit(1);
        }

        //Overwrite default sections with custom ones if they exist
        options.sections = customOptions.sections;

        options = _.merge(options, customOptions);

        //Move customVariables options to JSON output
        masterData.customVariables = options.customVariables;

    }

    // Add walker exclude directories if set
    if(Object.prototype.toString.call(options.excludeDirs) === '[object Array]') {
        options.walkerOptions.filters = options.excludeDirs;
    }
}

/**
 * Read template/theme/highlight files
 *
 */
function readTheme() {
    try {
        _v.templateSource = fs.readFileSync(options.templateFile, 'utf8');
    }
    catch(err) {
        console.error(_v.logPre + _v.error('Could not read template file: ' + options.templateFile));
        process.exit(1);
    }

    try {
        _v.themeSource = fs.readFileSync(options.themeFile, 'utf8');
    }
    catch(err) {
        console.error(_v.logPre + _v.error('Could not read theme file: ' + options.themeFile));
        process.exit(1);
    }

    try {
        _v.highlightSource = fs.readFileSync(path.join(options.highlightFolder, options.highlightStyle + '.css'), 'utf8');
    }
    catch(err) {
        console.error(_v.logPre + _v.error('Could not read highlight file: ' + path.join(options.highlightFolder, options.highlightStyle + '.css')));
        process.exit(1);
    }
}

/**
 * Read valid files (default: scss/css), get the Styleguide comments and put into an array
 *
 * @param {Object} walker
 */
function readSGFile(fileExtension, root, fileStats, fileContents) {

    fs.readFile(path.join(root, fileStats.name), 'utf8', function (err, content) {
        var regEsp;
        var filePath = './' + path.join(root, _v.info(fileStats.name));

        listFiles(filePath);

        if (err) {
            console.error(_v.logPre + _v.error('File Error:') + err);
            process.exit(1);
        }

        // Use <SG></SG> for markdown files
        if (fileExtension === "md" || fileExtension === "markdown" || fileExtension === "mdown") {
            var pattern = new RegExp('\\< ?' + options.sgComment + '>([\\s\\S]*?)\\< ?\\/' + options.sgComment + ' ?\\>', 'gi');
        }
        else {
            var pattern = new RegExp('/\\* ?' + options.sgComment + '([\\s\\S]*?)\\*/', 'gi');
        }

        while ((regEsp = pattern.exec(content)) !== null) {
            //If reading anything other than css, create a file-location reference we'll use later
            var fileLocation = (fileExtension !== "css") ? '<filelocation>'+filePath+'</filelocation>': '';
            //Convert markdown to html
            fileContents.push(markdown(regEsp[1]) + fileLocation);
        }
    });
}

/**
 * Walk the file tree, and save files
 *
 * @param {Object} walker
 */
function walkFiles(walker) {
    var fileContents = [];

    walker.on("file", function (root, fileStats, next) {
        var fileExtension = fileStats.name.substr((~-fileStats.name.lastIndexOf(".") >>> 0) + 2).toLowerCase();

        if (options.fileExtensions[fileExtension]) {
            readSGFile(fileExtension, root, fileStats, fileContents);
            next();
        }
        else {
            next();
        }
    });

    walker.on("errors", function (root, nodeStatsArray, next) {
        console.error(_v.logPre + _v.error('Error'));
        console.dir(nodeStatsArray);
        process.exit(1);
    });


    //Wrap all comments starting with SG in a section
    walker.on("end", function () {
        fileContents = fileContents.join('</div>\n<div class="sg-article-' + _v.sgUniqueIdentifier + '">\n');

        var json = convertHTMLtoJSON('<div class="sg-article-' + _v.sgUniqueIdentifier + '">\n' + fileContents + '</div>');

        var html = template(json, options);

        saveFile(html);
    });
}

/**
 * Save html to file
 *
 * @param {String} html
 */
function saveFile(html) {
    fs.outputFile(options.outputFile, html, function(err, data) {
        if (err) {
            console.error(_v.logPre + err);
            process.exit(1);
        }
        console.info(_v.logPre + 'Created file: ' + _v.good(options.outputFile));
    });
}


function findSection($article) {
    var currentSection;
    var currentIdentifier;
    var headerText = $article('category').slice(0, 1).text() + $article('article').text();

    //Check headings for identifiers declared in "sections" option
    for (var sectionName in options.sections){
        currentIdentifier = options.sections[sectionName];

        if(headerText.indexOf(currentIdentifier) > -1 && currentIdentifier !== ''){
            currentSection = sectionName;
            break;
        }
    }

    if (currentSection === undefined){
        currentSection = _v.defaultSection;
        currentIdentifier = '';
    }

    return [currentSection, currentIdentifier];
}


/**
 * Take HTML and create JSON object to be parsed by Handlebars
 *
 * @param {String} html
 * @returns {Array} json
 */
function convertHTMLtoJSON(html) {
    var sectionObject = {};
    var error_log = false;
    var idCache = {};
    var currentIdentifier = '';
    var previousArticle;

    //Create section object for data structure, based on user's "sections" option
    for(var name in options.sections) {
        sectionObject[name] = [];

        //Note the section that requires no demarcation
        if (options.sections[name] === '') {
            _v.defaultSection = name;
        }
    }

    masterData.sections = Object.assign(sectionObject);

    var $ = cheerio.load(html);
    cheerioWrapAll($); //Add wrapAll method to cheerio

    // Loop each section and turn into javascript object
    $('.sg-article-' + _v.sgUniqueIdentifier).each(function (i, elem) {
        var $article = cheerio.load($(this).html());

        var articleData = {
            id: '',
            category: '',
            currentSection: null,
            section: {
                name: ''
            },
            fileLocation: $article('filelocation').text(),
            heading: '',
            code: [],
            markup: [],
            comment: '',
            priority: 50
        };

        //Check for mainsection headings
        if ($article('category')[0]) {
            articleData.currentSection = findSection($article)[0];
            currentIdentifier = findSection($article)[1];
        }
        else if(previousArticle !== undefined) {
            //Without a heading, assume it should be concatenated with the previous category
            articleData.id = previousArticle.id;
            articleData.category = previousArticle.category;
            articleData.heading = previousArticle.heading;
            articleData.currentSection = previousArticle.section.name;
        }

        $article('category').each(function (i2, elem2) {
            if (articleData.category === ''){
                articleData.category = $(this).text().replace(/^\s+|\s+$/g, '').replace(currentIdentifier, '').trim();
            }
            else {
                var content = renderer.heading.call(renderer, $(this).html(), 1.5);
                $(this).replaceWith($(content));
            }

        }).remove();

        $article('sectionmark').each(function (i2, elem2) {
            articleData.currentSection = $(this).text().trim();
            currentIdentifier = options.sections[articleData.currentSection];

            if(currentIdentifier === undefined) {
                console.error(_v.logPre + _v.error("Error: '" + articleData.currentSection + "' in file '" + articleData.fileLocation + "' is not a registered 'section' in your .styleguide file."));
                process.exit(1);
            }
        }).remove();

        $article('category-article').each(function (i2, elem2) {
            //Remove dev identifier and extra spaces
            articleData.heading += $(this).text().replace(/^\s+|\s+$/g, '').replace(currentIdentifier, '').trim();

        }).remove();

        //Store code examples and markup
        $article('examplecode').each(function (i2, elem2) {
            var categoryCode = $(this).html().replace(/^\s+|\s+$/g, '');
            articleData.code.push(categoryCode);

            //Run markup through highlight.js
            articleData.markup.push(hl.highlight("html", categoryCode).value);

        }).remove();

        //Wrap dd/dt inside <dl>s
        $article('.sg-code-meta-type').each(function (i2, elem2) {
            var $dddt = $(this).nextUntil(":not(dd, dt)").addBack();
            $dddt.filter('dd, dt').wrapAll('<dl class="sg-code-meta-block"></dl>');
            $article('.sg-code-meta-block').find('br').remove();

        }).remove();

        //Grab priority tag data and convert them to meaningful values
        $article('priority').each(function(i2, elem2) {
            var priorityNumber = $(this).text().trim();

            if ( priorityNumber == 'last') {
                articleData.priority = 99;
            }
            else if ( priorityNumber == 'first') {
                articleData.priority = -99;
            }
            else {
                articleData.priority = Number(priorityNumber);
            }

        }).remove();

        //Give category an ID
        articleData.id = sanitize.makeUrlSafe(articleData.category  + '-' + articleData.heading);

        //Save sanitized comment html
        articleData.comment = $article.html().replace(/^\s+|\s+$/g, '');

        //Move category data to master
        saveToMaster(articleData);
    });

    /**
     * Combine repeat categories by checking with the ID cache
     * ID Cache format:
     * {1: ["development", 5]}
     * {ID:[section, category-index]}
     *
     * @param {object} articleData - data parsed by DOM objects
     *
    **/

    function saveToMaster(articleData) {

        var currentSection = articleData.currentSection;

        //Bail out for un-categorized comments
        if (currentSection === null) {
            return;
        }

        //If the section's ID has already been cached,
        // just append its data to the previous object
        if (idCache.hasOwnProperty(articleData.id)) {

            //Grab the index
            var currentIndex = idCache[articleData.id][1];

            //Select the matched section from the masterData
            var selectedSection = masterData.sections[currentSection][currentIndex];

            //Append the new data to the matched section
            selectedSection.comment += articleData.comment;

            if (articleData.markup.length > 0) {
                selectedSection.markup.push(articleData.markup);
                selectedSection.markup = _.flatten(selectedSection.markup);
            }
            if (articleData.code.length > 0) {
                selectedSection.code.push(articleData.code);
                selectedSection.code = _.flatten(selectedSection.code);
            }
        }
        else if(masterData.sections[currentSection]) {

            var catIndex = masterData.sections[currentSection].length;

            //Cache the ID and its index within its section
            idCache[articleData.id] = [currentSection, catIndex];
            articleData.section[currentSection] = true;

            articleData.section.name = articleData.currentSection;
            delete articleData.currentSection;

            //Append new section to master data
            sanitize.objectPush(masterData.sections[currentSection], articleData);

            previousArticle = articleData;

        }
    }

    /*
     * Sort section data
     */

    if (options.sortCategories){
        //Sort Sections
        for (var category in masterData.sections){
            masterData.sections[category] = sorting(masterData.sections[category]);
        }
    }

    function formatMasterData(sectionName, isMenu) {
        var menuObj = [{}];
        var sectionObj = [{}];
        var menuArr = [];
        var sectionArr = [];
        var sectionHeading;

        masterData.sections[sectionName].forEach(function(section) {

            //New categories: Create a new array to push objects into
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
                category: key,
                id: 'category-'+menuObj[0][key][0].id,
                headings: menuObj[0][key]
            });

            sectionArr.push({
                category: key,
                id: 'category-'+menuObj[0][key][0].id,
                articles: sectionObj[0][key]
            });
        });

        //Wasteful but simple
        return isMenu ? menuArr : sectionArr;
    }

    //Create menu and section JSON
    Object.keys(options.sections).forEach(function(section){
        masterData.menus[section] = formatMasterData(section, true);
        masterData.sections[section] = formatMasterData(section, false);
    });

    //Save JSON to file
    if (options.jsonOutput) {
        fs.outputFile(options.jsonOutput, JSON.stringify(masterData, null, '  '), function(err) {
            if(err){
                console.error(_v.logPre + 'Error: Cannot write ' + options.jsonOutput);
                console.error(err);
            }
            else {
                console.info(_v.logPre + 'Created file: ' + _v.good(options.jsonOutput));
            }
        });

    }

    module.exports.data = masterData;

    return masterData;
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


function init(args) {
    //Instantiate the markdown renderer before we merge our custom options
    renderer = new markdown.Renderer();
    //Add custom markdown rendering formatters
    renderer = formatters.register(renderer, options);

    //Set up stuff based on arguments
    readArgs(args);

    //Read and Merge default options with custom ones
    readConfig();

    //Make sure theme files exist and save their contents globally
    readTheme();

    //Set markdown options and set renderer to the custom one defined here
    options.markedOptions.renderer = renderer;

    markdown.setOptions(options.markedOptions);

    /**
     * Walk the file tree
     */
    walker = walk.walk(options.srcFolder, options.walkerOptions);

    walkFiles(walker);
}

/**
 * Initialize automatically if not being imported
 */
if(!module.parent) {
    init(process.argv.slice(2));
}


module.exports = function(args){
    return this.init = function(args) {
        init(args);
    }
};
