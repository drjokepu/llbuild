const LLBuild = require('..');

const targets = {
    'test': runTest
};

function runTest() {
    return Promise.resolve();
}

new LLBuild(targets).executeTarget('test').then(
    function() {
        console.log('Build complete.');
    },
    function(err) {
        console.error(err);
    }
);