var nodemon = require('nodemon');

console.log(
    'Starting tests',
    'Watching for changes.'
);

nodemon(
    '--ignore */styleguide/ -e js,hbs,css,styleguide index.js ls'
)
.on('quit', function() {
    process.exit(0);
});
