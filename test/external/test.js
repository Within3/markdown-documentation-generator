var styleguide = require('../../index.js');

var stuff = styleguide.create('lf', {htmlOutput:false, srcFolder: '../'});

stuff.then(function(data){
    console.log(data ? 'yay' :'boo');
});
