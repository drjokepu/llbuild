# llbuild [![Build Status](https://travis-ci.org/drjokepu/llbuild.svg?branch=master)](https://travis-ci.org/drjokepu/llbuild)
## Low level build tool for Node.js

### Usage
```javascript
const LLBuild = require('llbuild');

const targets = {
    'default': ['babel', 'less'],
    'babel': function() {
        // invoke babel
    },
    'less': function() {
        // invoke less
    }
};

new LLBuild(targets).executeTarget('default').then(
    function() {
        console.log('Build complete.');
    },
    function(err) {
        console.error(err);
    }
);

```