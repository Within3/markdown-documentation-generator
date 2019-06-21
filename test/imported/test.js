var styleguide = require('../../index.js');
var path = require('path');
var handlebars = require('handlebars');

var createStyleguide = styleguide.create('lf', {
    rootFolder: './',
    htmlOutput:'./styleguide/output.html',
    examplePreprocessor: function(text) {
        return handlebars.compile(text)();
    }
});

createStyleguide.then(function(data) {
    console.log('yay');
}).catch(function(data){
    console.log('boo');
    console.log(data);
});
