"use strict";

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

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
            ], 'test').then(function() {
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
            ], 'test', testContext);
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
                ], 'test').then(function() {
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
                ], 'test').then(function() {
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
            ], 'test').then(function() {
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
            ], 'test', testContext);
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
                ], 'test').then(function() {
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
                ], 'test').then(function() {
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
            }, 'test', testContext);
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
    
    describe('#executeAnyTarget', function() {
        it('null', function() {
            return new LLBuild().executeAnyTarget(null, 'test', null);
        });
        
        it('undefined', function() {
            return new LLBuild().executeAnyTarget(undefined, 'test', null);
        });
        
        it('true', function() {
            return new LLBuild().executeAnyTarget(true, 'test', null);
        });
        
        it('false', function() {
            return new LLBuild().executeAnyTarget(false, 'test', null);
        });
        
        describe('array', function() {
            it('serial', function() {
                let objs = [];
                return new LLBuild().executeAnyTarget([
                    true,
                    function() {
                        objs.push('fn0');
                        return Promise.resolve();
                    },
                    function() {
                        objs.push('fn1');
                        return Promise.resolve();
                    }
                ], 'test', null).then(function() {
                    assert.strictEqual(objs.length, 2);
                });
            });
            
            it('parallel', function() {
                let objs = [];
                return new LLBuild().executeAnyTarget([
                    function() {
                        objs.push('fn0');
                        return Promise.resolve();
                    },
                    function() {
                        objs.push('fn1');
                        return Promise.resolve();
                    }
                ], 'test', null).then(function() {
                    assert.strictEqual(objs.length, 2);
                });
            });
        });
        
        it('string', function() {
            const v0 = 'hello';
            let v1 = '';
            
            return new LLBuild({'fn': function() {
                v1 = v0;
            }}).executeAnyTarget('fn', 'test', null).then(function() {
                assert.strictEqual(v1, v0);
            });
        });
        
        it('function', function() {
            const v0 = 'hello';
            let v1 = '';
            
            return new LLBuild().executeAnyTarget(function() {
                v1 = v0;
            }, 'test', null).then(function() {
                assert.strictEqual(v1, v0);
            });
        });
    });

    describe('executeCommand', function() {
        describe('instance', function() {
            it('success', function() {
                const nodeVer = process.version;
                return new LLBuild({ }, { quiet: true }).executeCommand('node --version', null).then(function(output) {
                    const trimmedOutput = removeTrailingNewLine(output);
                    assert.strictEqual(nodeVer, trimmedOutput);
                });
            });

            it('failure', function() {
                return new LLBuild({ }, { quiet: true }).executeCommand('node --invalid-arg', null).then(function(output) {
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

        describe('static', function() {
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

    describe('mkdirp', function() {
        it('instance', function() {
            const fpath = path.resolve(testFolderPath(), 'mkdirp_test', 'test1', 'test2');
            return makeTestFolder().then(function() {
                return new LLBuild({ }, { quiet: true }).mkdirp(fpath, null);
            }).then(function() {
                return new Promise(function (resolve, reject) {
                    fs.stat(fpath, function(err, stats) {
                        if (err) {
                            reject(err);
                        } else {
                            if (stats.isDirectory()) {
                                resolve();
                            } else {
                                reject(new Error('Output of mkdirp is not a directory'));
                            }
                        }
                    });
                });
            }).then(removeTestFolder);
        });

        it('static', function() {
            const fpath = path.resolve(testFolderPath(), 'mkdirp_test', 'test1', 'test2');
            return makeTestFolder().then(function() {
                return LLBuild.mkdirp(fpath, true);
            }).then(function() {
                return new Promise(function (resolve, reject) {
                    fs.stat(fpath, function(err, stats) {
                        if (err) {
                            reject(err);
                        } else {
                            if (stats.isDirectory()) {
                                resolve();
                            } else {
                                reject(new Error('Output of mkdirp is not a directory'));
                            }
                        }
                    });
                });
            }).then(removeTestFolder);
        });
    });

    describe('rmrf', function() {
        it('instance', function() {
            const fpath = path.resolve(testFolderPath(), 'rmrftest');
            return makeTestFolder().then(function() {
                return new LLBuild({ }, { quiet: true }).mkdirp(path.resolve(fpath, 'testA', 'testB', 'testC'), null);
            }).then(function() {
                return new LLBuild({ }, { quiet: true }).rmrf(fpath, null);
            }).then(function() {
                return new Promise(function (resolve, reject) {
                    fs.stat(fpath, function(err, stats) {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                resolve();
                            } else {
                                reject(err);
                            }
                        } else {
                            reject(new Error('Deleted folder still exists.'));
                        }
                    });
                });
            }).then(removeTestFolder);
        });

        it('static', function() {
            const fpath = path.resolve(testFolderPath(), 'rmrftest');
            return makeTestFolder().then(function() {
                return new LLBuild({ }, { quiet: true }).mkdirp(path.resolve(fpath, 'testA', 'testB', 'testC'), null);
            }).then(function() {
                return LLBuild.rmrf(fpath, true);
            }).then(function() {
                return new Promise(function (resolve, reject) {
                    fs.stat(fpath, function(err, stats) {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                resolve();
                            } else {
                                reject(err);
                            }
                        } else {
                            reject(new Error('Deleted folder still exists.'));
                        }
                    });
                });
            }).then(removeTestFolder);
        });
    });

    describe('events', function() {
        it('targetExecutionStarted', function() {
            const targets = {
                'test': function() { return Promise.resolve(); }
            };

            let didEmitEvent = false;

            const llbuild = new LLBuild(targets);
            llbuild.addListener('targetExecutionStarted', function() {
                didEmitEvent = true;
            });

            return llbuild.executeTarget('test').then(() => {
                if (didEmitEvent) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error('Did not emit targetExecutionStarted event.'));
                }
            });
        });

        it('targetExecutionCompleted', function() {
            const targets = {
                'test': function() { return Promise.resolve(); }
            };

            let didEmitEvent = false;
            let didEmitOtherEvent = false;

            const llbuild = new LLBuild(targets);
            llbuild.addListener('targetExecutionCompleted', function() {
                didEmitEvent = true;
            });

            llbuild.addListener('targetExecutionFailed', function() {
                didEmitOtherEvent = true;
            });

            return llbuild.executeTarget('test').then(() => {
                if (didEmitEvent) {
                    if (didEmitOtherEvent) {
                        return Promise.reject(new Error('Did unexpectedly emit targetExecutionFailed event.'));
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Promise.reject(new Error('Did not emit targetExecutionCompleted event.'));
                }
            });
        });

        it('targetExecutionFailed', function() {
            const targets = {
                'test': function() { return Promise.reject(new Error('Test Error')); }
            };

            let didEmitEvent = false;
            let didEmitOtherEvent = false;

            const llbuild = new LLBuild(targets);
            llbuild.addListener('targetExecutionFailed', function() {
                didEmitEvent = true;
            });

            llbuild.addListener('targetExecutionCompleted', function() {
                didEmitOtherEvent = true;
            });

            return llbuild.executeTarget('test').catch(err => { return Promise.resolve(); }).then(() => {
                if (didEmitEvent) {
                    if (didEmitOtherEvent) {
                        return Promise.reject(new Error('Did unexpectedly emit targetExecutionCompleted event.'));
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Promise.reject(new Error('Did not emit targetExecutionFailed event.'));
                }
            });
        });

        it('buildStarted', function() {
            const targets = {
                'test': function() { return Promise.resolve(); }
            };

            let didEmitEvent = false;

            const llbuild = new LLBuild(targets);
            llbuild.addListener('buildStarted', function() {
                didEmitEvent = true;
            });

            return llbuild.executeTarget('test').then(() => {
                if (didEmitEvent) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error('Did not emit buildStarted event.'));
                }
            });
        });

        it('buildComplete', function() {
            const targets = {
                'test': function() { return Promise.resolve(); }
            };

            let didEmitEvent = false;
            let didEmitOtherEvent = false;

            const llbuild = new LLBuild(targets);
            llbuild.addListener('buildComplete', function() {
                didEmitEvent = true;
            });

            llbuild.addListener('buildFailed', function() {
                didEmitOtherEvent = true;
            });

            return llbuild.executeTarget('test').then(() => {
                if (didEmitEvent) {
                    if (didEmitOtherEvent) {
                        return Promise.reject(new Error('Did unexpectedly emit buildFailed event.'));
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Promise.reject(new Error('Did not emit buildComplete event.'));
                }
            });
        });

        it('buildFailed', function() {
            const targets = {
                'test': function() { return Promise.reject(new Error('Test Error')); }
            };

            let didEmitEvent = false;
            let didEmitOtherEvent = false;

            const llbuild = new LLBuild(targets);
            llbuild.addListener('buildFailed', function() {
                didEmitEvent = true;
            });

            llbuild.addListener('buildComplete', function() {
                didEmitOtherEvent = true;
            });

            return llbuild.executeTarget('test').catch(err => { return Promise.resolve(); }).then(() => {
                if (didEmitEvent) {
                    if (didEmitOtherEvent) {
                        return Promise.reject(new Error('Did unexpectedly emit buildComplete event.'));
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Promise.reject(new Error('Did not emit buildFailed event.'));
                }
            });
        });

        it('consoleOutput', function() {
            const targets = {
                'all': [true, 'test1', 'test2'],
                'test1': function(b) { b.print('test1'); return Promise.resolve(); },
                'test2': function(b) { b.print('test2'); return Promise.resolve(); }
            };

            let outputStr = '';

            const llbuild = new LLBuild(targets, { quiet: true });
            llbuild.addListener('consoleOutput', function(ev) {
                outputStr += ev.content;
            });

            return llbuild.executeTarget('all').then(() => {
                assert.strictEqual(outputStr, 'test1test2');
            });
        })
    });
});

describe('typings', function() {
    it('TypeScript', function() {
        this.timeout(10000);
        return new LLBuild({ }, { quiet: true }).executeCommand(`node "${path.resolve(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc')}" -p "${path.resolve(__dirname, 'typing-test')}"`, null, true);
    });
});

function removeTrailingNewLine(str) {
    return str.replace(/(\n|\r)+$/, '');
}

function testFolderPath() {
    return path.resolve(__dirname, 'tmp');
}

function makeTestFolder() {
    return removeTestFolder().then(mkdirp(testFolderPath()));
}

function removeTestFolder() {
    return new Promise(function(resolve, reject) {
        rimraf(testFolderPath(), function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}