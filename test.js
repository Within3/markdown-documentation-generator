var nodemon = require('nodemon');

nodemon(
    '--ignore */styleguide/ -e js,hbs,css,styleguide index.js ls'
)
.on('quit', function() {
    process.exit(0);
});
