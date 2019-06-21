const path = require('path');

module.exports = {
  "restartable": "rs",
  "ignore": [
    "./styleguide/**/*.*",
    "test.js"
  ],
  "verbose": false,
  "script": path.resolve(__dirname, "../index.js"),
  "env": {
    "NODE_ENV": "development"
  },
  "ext": "js hbs css scss styleguide",
  "args": [],
  "watch": [
      path.resolve(__dirname, '../') + '/**/*'
  ]
};
