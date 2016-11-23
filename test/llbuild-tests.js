"use strict";

const assert = require('assert');
const path = require('path');
const LLBuild = require('../index.js');

describe('LLBuild', function() {
    describe('#executeArrayTargetSerially', function() {
        const testContext = 'context_str';
        
        it('state manipulation', function() {
            let objs = [];
            return new LLBuild().executeArrayTargetSerially([
                true,
                function(builder, context) {
                    assert.notEqual(builder, false);
                    objs.push('fn0');
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.notEqual(builder, false);
                    objs.push('fn1');
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.notEqual(builder, false);
                    objs.push('fn2');
                    return Promise.resolve();
                }
            ]).then(function() {
                assert.strictEqual(objs.length, 3);
            });
        });
        
        it('context', function() {
            const testContext = 'context_str';
            return new LLBuild().executeArrayTargetSerially([
                true,
                function(builder, context) {
                    assert.strictEqual(context, testContext);
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.strictEqual(context, testContext);
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.strictEqual(context, testContext);
                    return Promise.resolve();
                }
            ], testContext);
        });
        
        describe('rejection', function() {
            it('first', function() {
                return new LLBuild().executeArrayTargetSerially([
                    true,
                    function(builder, context) {
                        return Promise.reject('Expected error.');
                    },
                    function(builder, context) {
                        return Promise.resolve();
                    },
                    function(builder, context) {
                        return Promise.resolve();
                    }
                ]).then(function() {
                    return Promise.reject(new Error('Promise was not fulfilled with error.'));
                }, function() {
                    return Promise.resolve();
                });
            });
            
            it('not first', function() {
                return new LLBuild().executeArrayTargetSerially([
                    true,
                    function(builder, context) {
                        return Promise.resolve();
                    },
                    function(builder, context) {
                        return Promise.reject('Expected error.');
                    },
                    function(builder, context) {
                        return Promise.resolve();
                    }
                ]).then(function() {
                    return Promise.reject(new Error('Promise was not fulfilled with error.'));
                }, function() {
                    return Promise.resolve();
                });
            });
        });
    });
    
    describe('#executeArrayTargetInParallel', function() {
        const testContext = 'context_str';
        
        it('state manipulation', function() {
            let objs = [];
            return new LLBuild().executeArrayTargetInParallel([
                function(builder, context) {
                    assert.notEqual(builder, false);
                    objs.push('fn0');
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.notEqual(builder, false);
                    objs.push('fn1');
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.notEqual(builder, false);
                    objs.push('fn2');
                    return Promise.resolve();
                }
            ]).then(function() {
                assert.strictEqual(objs.length, 3);
                return Promise.resolve();
            });
        });
        
        it('context', function() {
            const testContext = 'context_str';
            return new LLBuild().executeArrayTargetInParallel([
                function(builder, context) {
                    assert.strictEqual(context, testContext);
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.strictEqual(context, testContext);
                    return Promise.resolve();
                },
                function(builder, context) {
                    assert.strictEqual(context, testContext);
                    return Promise.resolve();
                }
            ], testContext);
        });
        
        describe('rejection', function() {
            it('first', function() {
                return new LLBuild().executeArrayTargetInParallel([
                    function(builder, context) {
                        return Promise.reject('Expected error.');
                    },
                    function(builder, context) {
                        return Promise.resolve();
                    },
                    function(builder, context) {
                        return Promise.resolve();
                    }
                ]).then(function() {
                    return Promise.reject(new Error('Promise was not fulfilled with error.'));
                }, function() {
                    return Promise.resolve();
                });
            });
            
            it('not first', function() {
                return new LLBuild().executeArrayTargetInParallel([
                    function(builder, context) {
                        return Promise.resolve();
                    },
                    function(builder, context) {
                        return Promise.reject('Expected error.');
                    },
                    function(builder, context) {
                        return Promise.resolve();
                    }
                ]).then(function() {
                    return Promise.reject(new Error('Promise was not fulfilled with error.'));
                }, function() {
                    return Promise.resolve();
                });
            });
        });
    });
    
    describe('#executeTargetWithName()', function() {
        it('state manipulation', function() {
            let objs = [];
            return new LLBuild({
                'test': function(builder, context) {
                    objs.push('fn');
                }
            }).executeTargetWithName('test').then(function (params) {
                assert.strictEqual(objs.length, 1);
            });
        });
        
        it('context', function() {
            const testContext = 'context_str';
            return new LLBuild({
                'test': function(builder, context) {
                    assert.strictEqual(context, testContext);
                }
            }).executeTargetWithName('test', testContext);
        });
        
        it('missing', function() {
            let objs = [];
            return new LLBuild().executeTargetWithName('test').then(function() {
                return Promise.reject(new Error('Promise was not fulfilled with error.'));
            }, function() {
                return Promise.resolve();
            });
        });
    });
    
    describe('#executeTargetRunner()', function() {
        it('empty function', function() {
            return new LLBuild().executeTargetRunner(function(builder, context) {
                assert.notEqual(builder, false);
                return Promise.resolve();
            });
        });
        
        it('state manipulation', function() {
            let objs = [];
            return new LLBuild({}).executeTargetRunner(function(builder, context) {
                objs.push('fn');
                return Promise.resolve();
            }).then(function() {
                assert.strictEqual(objs.length, 1);
            });
        });
        
        it('no context', function() {
            return new LLBuild({}).executeTargetRunner(function(builder, context) {
                assert.strictEqual(context, undefined);
                return Promise.resolve();
            });
        });
        
        it('with context', function() {
            const testContext = 'context_str';
            return new LLBuild({}).executeTargetRunner(function(builder, context) {
                assert.strictEqual(context, testContext);
                return Promise.resolve();
            }, testContext);
        });
        
        describe('rejection', function() {
            it('rejected promise', function() {
                return new LLBuild().executeTargetRunner(function(builder, context) {
                    return Promise.reject(new Error('Expected error.'));
                }).then(function() {
                    return Promise.reject(new Error('Promise was not fulfilled with error.'));
                }, function() {
                    return Promise.resolve();
                });
            });
            
            it('error thrown', function() {
                return new LLBuild().executeTargetRunner(function(builder, context) {
                    throw new Error('Expected error.');
                }).then(function() {
                    return Promise.reject(new Error('Promise was not fulfilled with error.'));
                }, function() {
                    return Promise.resolve();
                });
            });
        });
    });
    
    describe('#executeTarget', function() {
        it('null', function() {
            return new LLBuild().executeTarget(null, null);
        });
        
        it('undefined', function() {
            return new LLBuild().executeTarget(undefined, null);
        });
        
        it('true', function() {
            return new LLBuild().executeTarget(true, null);
        });
        
        it('false', function() {
            return new LLBuild().executeTarget(false, null);
        });
        
        describe('array', function() {
            it('serial', function() {
                let objs = [];
                return new LLBuild().executeTarget([
                    true,
                    function() {
                        objs.push('fn0');
                        return Promise.resolve();
                    },
                    function() {
                        objs.push('fn1');
                        return Promise.resolve();
                    }
                ], null).then(function() {
                    assert.strictEqual(objs.length, 2);
                });
            });
            
            it('parallel', function() {
                let objs = [];
                return new LLBuild().executeTarget([
                    function() {
                        objs.push('fn0');
                        return Promise.resolve();
                    },
                    function() {
                        objs.push('fn1');
                        return Promise.resolve();
                    }
                ], null).then(function() {
                    assert.strictEqual(objs.length, 2);
                });
            });
        });
        
        it('string', function() {
            const v0 = 'hello';
            let v1 = '';
            
            return new LLBuild({'fn': function() {
                v1 = v0;
            }}).executeTarget('fn', null).then(function() {
                assert.strictEqual(v1, v0);
            });
        });
        
        it('function', function() {
            const v0 = 'hello';
            let v1 = '';
            
            return new LLBuild().executeTarget(function() {
                v1 = v0;
            }, null).then(function() {
                assert.strictEqual(v1, v0);
            });
        });
    });

    describe('executeCommand', function() {
        it('success', function() {
            const nodeVer = process.version;
            return LLBuild.executeCommand('node --version', true).then(function(output) {
                const trimmedOutput = removeTrailingNewLine(output);
                assert.strictEqual(nodeVer, trimmedOutput);
            });
        });

        it('failure', function() {
            return LLBuild.executeCommand('node --invalid-arg', true).then(function(output) {
                return Promise.reject(new Error('Command was successful, but was expected to fail.'));
            }, err => {
                const errorMessageTail = ' --invalid-arg\nnode: bad option: --invalid-arg\n';
                assert.ok(err.message, 'err.message is null, undefined or empty');
                assert.ok(err.message.length > errorMessageTail.length, 'err.message is not long enough: ' + err.message);
                assert.strictEqual(errorMessageTail, err.message.substr(err.message.length - errorMessageTail.length));
                return Promise.resolve();
            });
        });
    });
});

describe('typings', function() {
    it('TypeScript', function() {
        this.timeout(10000);
        return LLBuild.executeCommand(`node "${path.resolve(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc')}" -p "${path.resolve(__dirname, 'typing-test')}"`, true);
    });
});

function removeTrailingNewLine(str) {
    return str.replace(/(\n|\r)+$/, '');
}