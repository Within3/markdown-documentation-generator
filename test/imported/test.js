var styleguide = require('../../index.js');
var path = require('path');

var createStyleguide = styleguide.create('lf', {
    rootFolder: './',
    htmlOutput:'./styleguide/output.html'
});

createStyleguide.then(function(data){
    console.log('yay');
}).catch(function(data){
    console.log('boo');
    console.log(data);
});
