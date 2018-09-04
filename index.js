#!/usr/bin/env node
/* jshint node: true  */
/* jshint esnext: true*/
"use strict";

var _sg        = require('./lib/globals'); //"Global" variables
var formatters = require('./lib/md-formats');
var logFiles  = require('./lib/log');
var log        = require('./lib/log').generic;
var sanitize   = require('./lib/sanitize');
var sorting    = require('./lib/sorts');
var tags       = require('./lib/tags').tags;
var template   = require('./lib/templating');

var chalk      = require('chalk');
var cheerio    = require('cheerio');
var fs         = require('fs-extra');
var hl         = require('highlight.js');
var _          = require('lodash');
var markdown   = require('marked');
var path       = require('path');
var walk       = require('walk');
var argv       = require('yargs').argv;

//Default options
let options = {
    sgComment: 'SG',
    exampleIdentifier: 'html_example',
    sortCategories: true,
    sections: {
        "styles": '',
        "development": 'Dev:'
    },
    rootFolder: './',
    excludeDirs: ['target', 'node_modules', '.git'],
    fileExtensions: {
        scss: true,
        sass: true,
        less: true,
        md: true,
        css: false
    },
    templateFile: sanitize.path('./', 'template/template.hbs'),
    themeFile: sanitize.path('./', 'template/theme.css'),
    htmlOutput: './styleguide/styleguide.html',
    jsonOutput: './styleguide/styleguide.json',
    handlebarsPartials: {
        "jquery": path.resolve(__dirname, 'template/jquery.js'),
        "sticky": sanitize.path('./', 'template/sticky.js')
    },
    highlightStyle: 'arduino-light',
    highlightFolder: path.relative('./', path.join(_sg.hljsDir, '../styles/')),
    customVariables: {
        "pageTitle": "Style Guide"
    },
    markedOptions: {
        gfm: true,
        breaks: true,
        smartypants: true
    },
    logging: {
        prefix: "[Style Guide]",
        level: "verbose"
    }
};

//Argument methods
const arg = {
    init: function() {

        let configFilePath = path.join(process.cwd(), '.styleguide'),
            existingConfig;

        try {
            existingConfig = fs.readJSONSync(configFilePath, 'utf8');
        }
        catch(err) {
            fs.writeFileSync(configFilePath, JSON.stringify(options,null,'\t'));
            logFiles(configFilePath, 'create');
        }

        if (existingConfig !== undefined) {
            const configError = _sg.error(_sg.logPre +
                'Configuration file ' +
                _sg.info('\'.styleguide\'') + ' already exists in this directory. \n' +
                _sg.logPre + 'Edit that file, or delete it and run ' +
                _sg.info('\'init\'') + ' again if you want to create a new configuration file.'
            );
            throw new Error(configError);
        }
        process.exit(0);
    },
    config: function() {
        _sg.configFile = argv.config || _sg.configFile;
    },
    lf: function() {
        _sg.fileList = true;
    },
    ls: function() {
        _sg.fileList = true;
    },
    help: function() {
        console.info('');
        console.info(_sg.brand('     _____                                         '));
        console.info(_sg.brand('    / ___/ _        / |                ( )   / |     '));
        console.info(_sg.brand('   | (___ | |_ _   _| | ___  __ _ _   _ _  __| | ___ '));
        console.info(_sg.brand('    \\___ \\| __| | | | |/ _ \\/ _` | | | | |/ _` |/ _ \\'));
        console.info(_sg.brand('    ____) | |_| |_| | |  __/ (_| | |_| | | (_| |  __/'));
        console.info(_sg.brand('    \\____/ \\___\\__, |_|\\___/\\__, |\\__,_|_|\\__,_|\\___/'));
        console.info(_sg.brand('                __/ |        __/ |                   '));
        console.info(_sg.brand('               |___/        |___/                    '));
        console.info('');
        console.info('   ' + _sg.brand('md_documentation') + '                     Generate styleguide');
        console.info('   ' + _sg.brand('md_documentation --config=[filename]') + ' Generate styleguide using a custom config file');
        console.info('   ' + _sg.brand('md_documentation --init') + '              Create a new configuration file in the current directory');
        console.info('   ' + _sg.brand('md_documentation --lf') + '                Show "Reading [filename]" during file processing' );
        console.info('   ' + _sg.brand('md_documentation --help') + '              Show this');
        console.info('');
        console.info('   More help at');
        console.info('   https://github.com/UWHealth/markdown-documentation-generator');
        console.info('');
        process.exit(0);
    }
};

/**
 * Check arguments against arg object and run that method
 *
 * @param {Array} args - arguments
 */
function readArgs(args) {

    if (args.length > 0) {
        let curArg = args[0].toLowerCase().replace(/-/g, '').split(/=/g)[0];
        if (_.isUndefined(arg[curArg])) {
            console.info( _sg.logPre + curArg + ' not recognized. Showing help instead.');
            arg.help();
        }
        else {
            arg[curArg]();
        }
    }
}

/**
 * Merge custom options with default options.
 * Resolves paths and makes sure they're output in a relative format.
 *
 * @param {Object} customOptions - user-provided options
 * @return {Object} - Merged options
 */

function mergeOptions(defaults, customOptions) {

    //Resolve relative paths from what is here to what is passed in
    //Return a relative path for simpler display purposes
    function getPath(folder){
        const root = path.resolve(customOptions.rootFolder);
        return path.relative(root, path.resolve(_sg.moduleDir, folder));
    }

    //Resolve paths for only a custom rootFolder
    if (customOptions.rootFolder) {
        defaults.highlightFolder = getPath(defaults.highlightFolder);
        defaults.templateFile = getPath(defaults.templateFile);
        defaults.themeFile = getPath(defaults.themeFile);
        defaults.handlebarsPartials.jquery = getPath(defaults.handlebarsPartials.jquery);
        defaults.handlebarsPartials.sticky = getPath(defaults.handlebarsPartials.sticky);
    }

    let logging = Object.assign({}, defaults.logging, customOptions.logging || {});

    _sg.logLevel = logging.level;
    _sg.logPre = _sg.brand(logging.prefix);

    //Overwrite default sections with custom ones if they exist
    defaults.sections = customOptions.sections || defaults.sections;
    //Merge custom and defaults
    let newOptions = _.merge(defaults, customOptions);

    newOptions.rootFolder = path.resolve(process.cwd(), newOptions.rootFolder);

    // Add excluded directories to walker options (if set)
    if (Object.prototype.toString.call(newOptions.excludeDirs) === '[object Array]') {
        newOptions.walkerOptions = {
            "filters": newOptions.excludeDirs,
            "followLinks": false
        };
    }

    return newOptions;
}

/**
 * Read configuration
 *
 * @param {Object} customOptions - user-provided options
 * @return {Object} - Merged user and default options
 */
function registerConfig(customOptions) {

    try {
        logFiles(_sg.brand('Configuration'));
        //Read passed object or configFile global.
        customOptions = customOptions || fs.readJSONSync(_sg.configFile, 'utf8');
    }
    catch(err) {
        if (err.code !== "ENOENT") {
            err.message = _sg.logPre + err.message + '.\n    Check your configuration and try again.';
            throw new Error(_sg.error(err));
        }
    }

    if (_.isUndefined(customOptions)) {
        log(_sg.warn(
            `No configuration file (\'${_sg.configFile}\') or options found, using defaults.`
        ), 1);

        customOptions = {
            walkerOptions: {
                "filters": options.excludeDirs,
                "followLinks": false
            }
        };
    }

    return mergeOptions(options, customOptions);

}

/**
 * Read template/theme/highlight files
 *
 */
function readTheme() {

    try {
        logFiles(_sg.brand('Template: ') + options.templateFile);
        _sg.templateSource = fs.readFileSync(path.resolve(_sg.root, options.templateFile), 'utf8');

        logFiles(_sg.brand('Theme: ') + options.themeFile);
        _sg.themeSource = fs.readFileSync(path.resolve(_sg.root, options.themeFile), 'utf8');

        logFiles(_sg.brand('Highlight Style: ') +
            path.relative(_sg.root, path.join(options.highlightFolder, options.highlightStyle + '.css')));
        _sg.highlightSource = fs.readFileSync(path.join(
            path.resolve(_sg.root, options.highlightFolder), options.highlightStyle + '.css'), 'utf8');
    }
    catch(err) {
        const pathError = _sg.logPre + _sg.error('Could not read file: ' + path.resolve(err.path));
        throw new Error(pathError);
    }
}

/**
 * Search through <category> tags for current section identifiers
 *
 * @param {Object} $article - article html loaded by cheerio
 * @return {Array} Section Name, Section identifier
 */
function findSection($article) {
    let currentSection, sectionIdentifier;
    let headerText = $article(tags.category).slice(0, 1).text() + $article(tags.article).text();

    //Check headings for identifiers declared in "sections" option
    for (let sectionName in options.sections){
        if ({}.hasOwnProperty.call(options.sections, sectionName)) {
            sectionIdentifier = options.sections[sectionName];

            if (headerText.indexOf(sectionIdentifier) > -1 && sectionIdentifier !== ''){
                currentSection = sectionName;
                break;
            }
        }
    }

    if (_.isUndefined(currentSection)){
        //Use the "default" section (the section without a pattern match)
        currentSection = _.invert(options.sections)[''];
        sectionIdentifier = '';
    }

    return [currentSection, sectionIdentifier];
}

/**
 * Constructs a section object
 *
 * @param {Object} $article - article html loaded by cheerio
 * @return {Object<Array>} Section Name, Section identifier
 */
function SectionStructure() {
    let structure = {};
    //Create section object for data structure, based on user's "sections" option
    for(let name in options.sections) {
        if ({}.hasOwnProperty.call(options.sections, name)) {
            structure[name] = [];
        }
    }

    return structure;
}

/**
 * Search through <meta> tags for current section identifiers
 *
 * @param {Object} $article - article html loaded by cheerio
 * @param {Object} articleData - structured data about the loaded article
 * @param {String} sectionIdentifier - string pattern that tells us the current section
 * @return {Object} articleData along with meta tags
 *
 */
function getMetaData($article, articleData, sectionIdentifier) {

    //Grab the filelocation and store it
    $article(tags.file).each(function () {
        articleData.filelocation = $article(this).text().trim();

    }).remove();

    $article(tags.section).each(function () {
        articleData.currentSection = $article(this).text().trim();
        sectionIdentifier = options.sections[articleData.currentSection];

        //A @section tag is pointing to a non-existant section
        if (_.isUndefined(sectionIdentifier)) {
            log(_sg.warn("Warning: '" + chalk.bold(articleData.currentSection) +
                "' is not a registered section in your configuration. (" + articleData.filelocation + ")"), 1);
            sectionIdentifier = '';
        }

    }).remove();

    $article(tags.category).each(function() {

        if (articleData.category === '') {
            articleData.category = $article(this)
                .text()
                .replace(/^\s+|\s+$/g, '')
                .replace(sectionIdentifier, '')
                .trim();

            $article(this).remove();
        }
        else {
            $article(this).replaceWith(
                _sg.renderer.heading($article(this).text(), 1.1)
            );
        }
    });

    $article(tags.article).each(function () {
        //Remove dev identifier and extra spaces
        articleData.heading += $article(this).text().replace(/^\s+|\s+$/g, '').replace(sectionIdentifier, '').trim();
    }).remove();

    //Store code examples and markup
    $article(tags.example).each(function () {
        let categoryCode = $article(this).html().replace(/^\s+|\s+$/g, '');
        articleData.code.push(categoryCode);

        //Run example markup through highlight.js
        articleData.markup.push(hl.highlight("html", categoryCode).value);

    }).remove();

    //Grab priority tag data and convert them to meaningful values
    $article(tags.priority).each(function() {
        let priority = $article(this).text().trim();
        articleData.priority = (_.isNaN(Number(priority))) ? priority : Number(priority);

    }).remove();

    if (articleData.heading === '') {
        articleData.priority = -1000;
    }

    return articleData;
}


/**
 * Take HTML and create JSON object to be parsed by Handlebars
 *
 * @param {String} html
 * @returns {Array} json
 */
function convertHTMLtoJSON(html) {
    let idCache = {};
    let sectionIdentifier = '';
    let previousArticle;

    let $ = cheerio.load(html);
    sanitize.cheerioWrapAll($); //Add wrapAll method to cheerio

    let masterData = {
        sections: new SectionStructure(),
        menus: {},
        colors: {},
        customVariables: options.customVariables
    };

    // Loop each section and turn into javascript object
    $('.sg-article-' + _sg.uniqueIdentifier).each(function() {
        let $article = cheerio.load($(this).html());

        let articleData = {
            id: '',
            currentSection: null,
            section: {
                name: ''
            },
            category: '',
            heading: '',
            code: [],
            markup: [],
            comment: '',
            priority: 50
        };

        //Check for category headings
        if ($article(tags.category)[0]) {
            const sectionInfo = findSection($article);
            articleData.currentSection = sectionInfo[0];
            sectionIdentifier = sectionInfo[1];
        }
        else if (previousArticle !== undefined) {
            //Without a heading, assume it should be concatenated with the previous category
            articleData.id = previousArticle.id;
            articleData.category = previousArticle.category;
            articleData.heading = previousArticle.heading;
            articleData.currentSection = previousArticle.section.name;
        }

        //Search through specific DOM elements for article meta data
        articleData = getMetaData($article, articleData, sectionIdentifier);

        //Give category an ID
        articleData.id = sanitize.makeUrlSafe(articleData.currentSection + '-' + articleData.category  + '-' + articleData.heading);

        //Save sanitized comment html
        articleData.comment = $article.html().replace('<p></p>', '').replace(/^\s+|\s+$/g, '');

        //Move and place article data into master
        articleData = checkData(articleData);

        return articleData;
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

    function checkData(articleData) {
        let currentSection = articleData.currentSection;

        //Bail out for un-categorized comments
        if (currentSection === null) {
            return;
        }

        //If the section's ID has already been cached,
        //append its data to the previous object
        if (idCache.hasOwnProperty(articleData.id)) {

            //Grab the index
            let currentIndex = idCache[articleData.id][1];

            //Select the matched section from the masterData
            let selectedSection = masterData.sections[currentSection][currentIndex];

            //Append the new data to the matched section
            selectedSection.comment += articleData.comment;

            if (articleData.markup.length > 0) {
                selectedSection.markup = _.union(selectedSection.markup, articleData.markup);
            }
            if (articleData.code.length > 0) {
                selectedSection.code = _.union(selectedSection.code, articleData.code);
            }

            //Set previous article so we can refer back if necessary
            previousArticle = selectedSection;

            return;
        }

        if (masterData.sections[currentSection]) {

            let catIndex = masterData.sections[currentSection].length;

            //Cache the ID and its index within its section
            idCache[articleData.id] = [currentSection, catIndex];
            articleData.section[_.camelCase(currentSection)] = true;

            articleData.section.name = articleData.currentSection;

            //Remove unnecessary data from final JSON
            delete articleData.currentSection;

            //Set previous article so we can refer back if necessary
            previousArticle = articleData;

            //Append new section to master data
            sanitize.objectPush(masterData.sections[currentSection], articleData);

        }
    }

    return formatData(masterData);
}

/**
 * Arranges and sorts data into a handlebars-friendly object.
 * Uses the structure:
 * {sections:[ {sectionName:{id:... , category:..., articles:[{...},...]} },...]}
 *
 * @param {Object} data - unformatted data
 * @returns {Object} formatted data
 */
function formatData(data) {
    //Sort section data
    if (options.sortCategories){
        //Sort Sections
        Object.keys(data.sections).forEach(function(category) {
            data.sections[category] = sorting(data.sections[category]);
        });
    }

    function formatSections(sectionName, isMenu) {

        let menuObj = {};
        let sectionObj = {};
        let menuArr = [];
        let sectionArr = [];


        data.sections[sectionName].forEach(function(section) {

            //New categories: Create a new array to push objects into
            if (_.has(menuObj, section.category) === false) {
                menuObj[section.category] = [];
                sectionObj[section.category] = [];
            }

            menuObj[section.category].push({
                id: section.id,
                name: (section.heading) ? section.heading : section.category
            });

            sectionObj[section.category].push(section);
        });

        Object.keys(menuObj).forEach(function(key) {
            menuArr.push({
                category: key,
                id: menuObj[key][0].id,
                headings: menuObj[key]
            });

            sectionArr.push({
                category: key,
                id: menuObj[key][0].id,
                articles: sectionObj[key]
            });
        });

        //Wasteful but simple
        return isMenu ? menuArr : sectionArr;
    }

    //Create menu and section JSON
    Object.keys(options.sections).forEach(function(section) {
        data.menus[section] = formatSections(section, true);
        data.sections[section] = formatSections(section, false);
    });

    return data;
}

/**
 * Based on the fileExtension, return a regular expression based on the user-defined sgComment
 *
 * @param {String} fileExtension
 * @returns {RegExp} pattern for either /* or <SG>
 *
 */
function regexType(fileExtension) {

    let sgComment = _.escapeRegExp(options.sgComment);

    if (["md", "markdown", "mdown"].indexOf(fileExtension) !== -1) {
        // Use <SG>...</SG> for markdown files
        return new RegExp('\\<' + sgComment + '>([\\s\\S]*?)\\<\\/' + sgComment + '\\>', 'gi');
    }
    // Use /*SG ... */ for everything else
    return new RegExp('/\\* ?' + sgComment + '([\\s\\S]*?)\\*/', 'gi');
}


/**
 * Read valid files (default: scss/css), get the Styleguide comments and put into an array
 *
 * @param {string} root
 * @param {String} fileExtension
 * @param {Object} fileStats
 * @param {Array} fileContents
 *
 */
function readSGFile(fileExtension, root, name, fileContents, callback) {

    fs.readFile(path.join(root, name), 'utf8', function (err, content) {
        let match,
            filePath = path.join(root, name),
            regex    = regexType(fileExtension);

        logFiles(path.relative(_sg.root, filePath));

        if (err) {
            const fileError = _sg.logPre + _sg.error('File Error: ' + filePath) + err;
            throw new Error(fileError);
        }

        while ((match = regex.exec(content)) !== null) {
            //If reading anything other than css, create a file-location reference we'll use later
            let fileLocation = (fileExtension !== "css") ? '<'+tags.file+'>'+path.relative(_sg.root, filePath)+'</'+tags.file+'>': '';
            //Convert markdown to html
            fileContents.push(markdown(match[1]) + fileLocation);
        }

        callback();
    });
}


/**
 * Take JSON, template and write out files or return as templates as a string.
 *
 * @param {Object} json - styleguide json data
 *
 */
function saveFiles(json){

    let output = {
        'json': json,
        'html': template(json, options)
    };
    let filePath;


    if (options.htmlOutput && _.isString(options.htmlOutput)) {
        filePath = path.resolve(_sg.root, options.htmlOutput);
        fs.outputFile(filePath, output.html, function(err) {
            if (err) {
                console.error(_sg.logPre + _sg.error('Error saving html file'));
                console.error(err);
            }
            else {
                logFiles(options.htmlOutput, 'create');
            }
        });
    }

    if (options.jsonOutput && _.isString(options.jsonOutput)) {
        filePath = path.resolve(_sg.root, options.jsonOutput);
        fs.outputFile(options.jsonOutput, JSON.stringify(json, null, '  '), function(err) {
            if (err){
                console.error(_sg.logPre + _sg.error('Error saving json file'));
                console.error(err);
            }
            else {
                logFiles(options.jsonOutput, 'create');
            }
        });
    }

    return output;
}


/**
 * Walk the file tree, and return templated html
 *
 * @param {Object} walker
 * @returns {Promise<String>} the file contents wrapped in divs
 *
 */
function walkFiles(walker, callback) {

    const extensions = _.reduce(options.fileExtensions, function(result, value, key){
        if(value){result.push(key);}
        return result;
    }, []).join(', ');

    log(_sg.info('Reading ' + extensions + ' files...'), 2);

    //Send back file contents once walker has reached its end
    var fileContents = [];

    walker.on("file", function (root, fileStats, next) {
        const fileExtension = fileStats.name.substr((~-fileStats.name.lastIndexOf(".") >>> 0) + 2).toLowerCase();

        if (options.fileExtensions[fileExtension]) {
            readSGFile(fileExtension, root, fileStats.name, fileContents, next);
        }
        else {
            next();
        }
    });

    walker.on("errors", function (root, nodeStatsArray) {
        const fileError = _sg.logPre + _sg.error('File reading Error ') + nodeStatsArray;
        throw new Error(fileError);
    });

    walker.on("end", function () {
        //If nothing is found after all files are read, give some info
        if (fileContents.length <= 0) {
            log('\n'+
                _sg.warn(
                'Could not find anything to document.')+
                '\n Please check the following:'+
                '\n  * You\'ve used /*'+options.sgComment+'*/ style comments.'+
                '\n  * Your "rootFolder" setting is pointing to the root of your style guide files.'+
                '\n  * If you\'re using the default settings, try using the "init" argument.'+
                '\n If you\'re still receiving this error, please check the documentation or file an issue at: \n'+
                chalk.blue.bold('github.com/UWHealth/markdown-documentation-generator/')
            , 1);
        }

        //Wrap all comments starting with SG in a section, send it back to the promise
        return callback(fileContents.join('</div>'+
            '\n<div class="sg-article-' + _sg.uniqueIdentifier + '">\n'));
    });
}


function init(args, customOptions) {

    //Set up stuff based on arguments
    readArgs(args);

    //Read and merge default options with custom ones
    options = registerConfig(customOptions);

    //Create global root reference
    _sg.root = path.resolve(options.rootFolder);

    //Make sure theme files exist and save their contents globally
    readTheme();

    _sg.renderer = new markdown.Renderer();
    //Add custom markdown rendering formatters
    _sg.renderer = formatters.register(_sg.renderer, options);
    //Overriding any custom ones since these are crucial to this application
    options.markedOptions.renderer = _sg.renderer;
    options.markedOptions.breaks = true;
    //Set markdown options and set renderer to the custom one defined here
    markdown.setOptions(options.markedOptions);

    //Walk the file tree
    const walker = walk.walk(_sg.root, options.walkerOptions);

    try {
        return walkFiles(walker, function(fileContents) {
            const json = convertHTMLtoJSON('<div class="sg-article-' + _sg.uniqueIdentifier + '">\n' + fileContents + '</div>');
            return saveFiles(json, options);
        });
    }
    catch(err) {
        throw new Error(err);
    }
}

module.exports.create = function(argv, customOptions) {
    //Assume args is actually customOptions if its an object
    if (_.isObject(argv)){
        customOptions = argv;
    }
    else if (! _.isArray(argv)){
        argv = [argv];
    }
    return new Promise(function(resolve, reject) {
            var data;
            try {
                data = init(argv, customOptions);
                return resolve(data);
            }
            catch(err){
                return reject(err);
            }
        }
    );
};

/**
 * Initialize automatically if not being imported
 */
(function(){
    if (!module.parent) {
        init(process.argv.slice(2));
    }
}());
