var styleguide = require('../../index.js');

var stuff = styleguide.create('lf', {htmlOutput:'./output.html', rootFolder: './../../test'});

stuff.then(function(data){
    console.log(data ? 'yay' :'boo');
});
