"use strict";

/**
 * @module llbuild
 * @license MIT
 */

const childProcess = require('child_process');
const EventEmitter = require('events').EventEmitter;
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const os = require('os');

/**
 * @typedef LLBuild~Target
 * @type {string|boolean|Array.<LLBuild~Target>|LLBuild~targetRunner}
 * Describes a build target.
 */

/**
 * @callback LLBuild~targetRunner
 * @param {LLBuild} builder The builder instance that invoked the target runner.
 * @param {Object?} context The context object that was provided to the {@link LLBuild#executeTarget} function.
 * @return {Promise} A promise object that will resolve after the callback was executed successfully.
 */

/**
 * Options passed in to the {@link LLBuild} constructor.
 * @interface LLBuild~LLBuildOptions
 * @property {boolean=} quiet If true, the builder will not print to the standard output and standard error.
 * @property {number=} maxBufferSize The maximum size of the stdout and stderr buffers (default is 200 * 1024).
 */

/**
 * Represents a builder instance.
 * @example
 * const LLBuild = require('llbuild');
 * 
 * const targets = {
 *     'default': ['babel', 'less'],
 *     'babel': function() {
 *         // invoke babel
 *     },
 *     'less': function() {
 *         // invoke less
 *     }
 * };
 *
 * new LLBuild(targets, { quiet: false }).runArgs().then(
 *     function() {
 *         console.log('Build complete.');
 *     },
 *     function(err) {
 *         console.error(err);
 *     }
 * );
 * */
class LLBuild {
    /**
     * Creates a new builder instance.
     * @param {Object.<string, LLBuild~Target>=} targets An optional object with string keys representing the target names and the associated values representing the targets.
     * @param {LLBuild~LLBuildOptions=} options A set of options controlling the behaviour of the builder instance.
     */
    constructor(targets, options) {
        this.targets = targets ? targets : {};
        this.options = LLBuild.makeDefaultOptions(options || {});
        this.emitter = new EventEmitter();
    }

    /**
     * Extends an an options object with any missing defaults.
     * @private
     * @param {LLBuild~LLBuildOptions} The options object to extends.
     * @return {LLBuild~LLBuildOptions} The extended options object.
     */
    static makeDefaultOptions(src) {
        var opts = Object.assign({}, src);
        if (opts.quiet === undefined) {
            opts.quiet = false;
        }

        if (opts.maxBufferSize === undefined) {
            opts.maxBufferSize = 200 * 1024;
        }

        return opts;
    }

    /**
     * Executes a target.
     * @param {String} target The name of the target to execute.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     * @example
     * const targets = {
     *     'default': ['babel', 'less'],
     *     'babel': function() {
     *         // invoke babel
     *     },
     *     'less': function() {
     *         // invoke less
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('default');
     */
    executeTarget(targetName, context) {
        if (!targetName || targetName.constructor !== String) {
            return Promise.reject(new Error('Target name is expected to be a string.'));
        } else {
            return (
                Promise
                .resolve()
                .then(() => { this.emitBuildStarted(targetName); return Promise.resolve(); })
                .then(() => this.executeAnyTarget(targetName, targetName, context))
                .then(
                    () => { this.emitBuildComplete(targetName); return Promise.resolve(); },
                    err => { this.emitBuildFailed(targetName, err); return Promise.reject(err); }
                )
            );
        }
    }

    /**
     * Executes a target of any type.
     * @pprivate
     * @param {String} target The name of the target to execute.
     * @param {String} targetName The name of the target or the first parent target with a name.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeAnyTarget(target, targetName, context) {
        if (target === null || target === undefined || target === true || target === false) {
            return Promise.resolve();
        } else if (target.constructor === Array) {
            return this.executeArrayTarget(target, targetName, context);
        } else if (target.constructor === String) {
            return this.executeTargetWithName(target, context);
        } else if (target.constructor === Function) {
            return this.executeTargetRunner(target, targetName, context);
        } else {
            return Promise.reject(new Error(`Unsupported target type: ${typeof(target)}`));
        }
    }
    
    /**
     * Executes an array target.
     * @private
     * @param {Array.<LLBuild~Target>} targetArray The target to execute.
     * @param {String} targetName The name of the target or the first parent target with a name.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeArrayTarget(targetArray, targetName, context) {
        if (targetArray.length === 0) {
            return Promise.resolve();
        }
        
        if (targetArray[0] === true) {
            return this.executeArrayTargetSerially(targetArray, targetName, context);
        } else {
            return this.executeArrayTargetInParallel(targetArray, targetName, context);
        }
    }
    
    /**
     * Executes an array target serially.
     * @private
     * @param {Array.<LLBuild~Target>} targetArray The target to execute.
     * @param {String} targetName The name of the target or the first parent target with a name.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeArrayTargetSerially(targetArray, targetName, context) {
        if (targetArray.length < 2) {
            return Promise.resolve();
        }
        
        let promise = this.executeAnyTarget(targetArray[1], targetName, context);
        for (let i = 2; i < targetArray.length; i++) {
            const nextTarget = targetArray[i];
            promise = promise.then(() => this.executeAnyTarget(nextTarget, targetName, context));
        }
        
        return promise;
    }
    
    /**
     * Executes an array target in parallel.
     * @private
     * @param {Array.<LLBuild~Target>} targetArray The target to execute.
     * @param {String} targetName The name of the target or the first parent target with a name.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeArrayTargetInParallel(targetArray, targetName, context) {
        return Promise.all(targetArray.map(t => this.executeAnyTarget(t, targetName, context)));
    }
    
    /**
     * Executes the target with the specified name.
     * @private
     * @param {string} targetName The name of the target to execute.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeTargetWithName(targetName, context) {
        const target = this.targets[targetName];
        if (target === null || target === undefined) {
            return Promise.reject(new Error(`Target does not exist: ${targetName}`));
        } else {
            return this.executeAnyTarget(target, targetName, context);
        }
    }
    
    /**
     * Executes a target runner callback.
     * @private
     * @param {LLBuild~targetRunner} targetRunner The target runner callback to execute.
     * @param {String} targetName The name of the target or the first parent target with a name.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the callback was executed successfully.
     */
    executeTargetRunner(targetRunner, targetName, context) {
        return (
            Promise
            .resolve()
            .then(() => { this.emitTargetExecutionStarted(targetName); return Promise.resolve(); } )
            .then(() => targetRunner(this, context))
            .then(
                () => { this.emitTargetExecutionCompleted(targetName); return Promise.resolve(); },
                err => { this.emitTargetExecutionFailed(targetName, err); return Promise.reject(err); }
            )
        );
    }

    /**
     * Parses the command line arguments and executes the selected target.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     * @example
     * const targets = {
     *     'default': ['babel', 'less'],
     *     'babel': function() {
     *         // invoke babel
     *     },
     *     'less': function() {
     *         // invoke less
     *     }
     * };
     *
     * new LLBuild(targets).runArgs();
     */
    runArgs(context) {
        return this.executeTarget(this.getArgTarget(), context);
    }

    /**
     * Gets the name of the target selected by the command line arguments.
     * @private
     * @return {string} The name of the target selected by the command line arguments.
     */
    getArgTarget() {
        if (process.argv.length < 3) {
            return 'default';
        } else {
            return process.argv[2];
        }
    }

    /**
     * Emits a build started event.
     * @private
     * @param {string} targetName The target whose building has started.
     * @fires LLBuild#buildStarted
     */
    emitBuildStarted(targetName) {
        /**
         * Indicates that a build has started.
         * @event LLBuild#buildStarted
         * @type {object}
         * @property {string} targetName The target whose building has started.
         * @example
         * llbuild.addListener('buildStarted', function(ev) {
         *     console.log(`Starting building ${ev.targetName}.`);
         * });
         */
        this.emitter.emit('buildStarted', { targetName: targetName });
    }

    /**
     * Emits a build complete event.
     * @private
     * @param {string} targetName The target whose building has completed.
     * @fires LLBuild#buildComplete
     */
    emitBuildComplete(targetName) {
        /**
         * Indicates that a build has completed.
         * @event LLBuild#buildComplete
         * @type {object}
         * @property {String} targetName The target whose building has completed.
         * @example
         * llbuild.addListener('buildComplete', function(ev) {
         *     console.log(`Completed building ${ev.targetName}.`);
         * });
         */
        this.emitter.emit('buildComplete', { targetName: targetName });
    }

    /**
     * Emits a build failed event.
     * @private
     * @param {string} targetName The target whose building has failed.
     * @fires LLBuild#buildFailed
     */
    emitBuildFailed(targetName, err) {
        /**
         * Indicates that a build has failed.
         * @event LLBuild#buildFailed
         * @type {object}
         * @property {string} targetName The target whose building has failed.
         * @property {Error} err The error object describing the error.
         * @example
         * llbuild.addListener('buildFailed', function(ev) {
         *     console.log(`Failed building ${ev.targetName}.`);
         * });
         */
        this.emitter.emit('buildFailed', { targetName: targetName, err: err });
    }
    
    /**
     * Emits a target execution started event.
     * @private
     * @param {string} targetName The target whose execution has started.
     * @fires LLBuild#targetExecutionStarted
     */
    emitTargetExecutionStarted(targetName) {
        /**
         * Indicates that the execution of a target with a {@link LLBuild~targetRunner} function has started.
         * @event LLBuild#targetExecutionStarted
         * @type {object}
         * @property {string} targetName The target whose execution has started.
         * @example
         * llbuild.addListener('targetExecutionStarted', function(ev) {
         *     console.log(`The execution of ${ev.targetName} has started.`);
         * });
         */
        this.emitter.emit('targetExecutionStarted', { targetName: targetName });
    }

    /**
     * Emits a target execution completed event.
     * @private
     * @param {string} targetName The target whose execution has completed.
     * @fires LLBuild#targetExecutionCompleted
     */
    emitTargetExecutionCompleted(targetName) {
        /**
         * Indicates that the execution of a target with a {@link LLBuild~targetRunner} function has completed.
         * @event LLBuild#targetExecutionCompleted
         * @type {object}
         * @property {string} targetName The target whose execution has completed.
         * @example
         * llbuild.addListener('targetExecutionCompleted', function(ev) {
         *     console.log(`The execution of ${ev.targetName} has completed.`);
         * });
         */
        this.emitter.emit('targetExecutionCompleted', { targetName: targetName });
    }

    /**
     * Emits a target execution failed event.
     * @private
     * @param {string} targetName The target whose execution has failed.
     * @param {Error=} err The error object describing the error.
     * @fires LLBuild#targetExecutionFailed
     */
    emitTargetExecutionFailed(targetName, err) {
        /**
         * Indicates that the execution of a target with a {@link LLBuild~targetRunner} function has failed.
         * @event LLBuild#targetExecutionFailed
         * @type {object}
         * @property {string} targetName The target whose execution has failed.
         * @property {Error} err The error object describing the error.
         * @example
         * llbuild.addListener('targetExecutionFailed', function(ev) {
         *     console.log(`The execution of ${ev.targetName} has failed: ${ev.error}`);
         * });
         */
        this.emitter.emit('targetExecutionFailed', { targetName: targetName, err: err });
    }

    /**
     * Emits a console output.
     * @private
     * @param {string} targetName The target whose execution has failed.
     * @param {string} content The content of the output.
     * @fires LLBuild#consoleOutput
     */
    emitConsoleOutput(targetName, content) {
        /**
         * Indicates a console output event..
         * @event LLBuild#consoleOutput
         * @type {object}
         * @property {String} targetName The target that emittet the output.
         * @property {String} content The content of the output.
         * @example
         * llbuild.addListener('consoleOutput', function(ev) {
         *     console.log(ev.content);
         * });
         */
        this.emitter.emit('consoleOutput', { targetName: targetName, content: content });
    }

    /**
     * Adds the listener function for the event named eventName.
     * @param {string} eventName The name of the event.
     * @param {Function} listener The callback function.
     */
    addListener(eventName, listener) {
        this.emitter.addListener(eventName, listener);
    }

    /**
     * Removes the specified listener from the event named eventName.
     * @param {string} eventName The name of the event.
     * @param {Function} listener The callback function.
     */
    removeListener(eventName, listener) {
        this.emitter.removeListener(eventName, listener);
    }

    /** Removes all listeners. */
    removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    /**
     * Executes the specified command as a child process.
     * @param {string} cmd The command to execute.
     * @param {string} targetName The target the command execution is associated with, or null.
     * @return {Promise} A promise object that will resolve with the contents of stdout after the command was executed successfully.
     * @example
     * const targets = {
     *     'less': function() {
     *         return LLBuild.executeCommand('less style.less');
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('less');
     */
    executeCommand(cmd, targetName) {
        const actualMaxBuffer = this.options.maxBufferSize;

        return new Promise((resolve, reject) => {
            this.print(cmd, targetName);
            
            const cp = childProcess.exec(cmd, {
                maxBuffer: actualMaxBuffer
            }, (err, stdout, stderr) => {
                if (err) {
                    if ((stdout && stdout.length > 0) || (stderr && stderr.length > 0)) {
                        let errStr = `'${cmd}' error:`;

                        if (stdout && stdout.length > 0) {
                            errStr += `${os.EOL}${stdout}`;
                        }

                        if (stderr && stderr.length > 0) {
                            errStr += `${os.EOL}${stderr}`;
                        }

                        this.print(errStr, targetName);
                    }

                    reject(err);
                    return;
                }

                if (stdout && stdout.length > 0) {
                    this.print(stdout, targetName);
                }

                if (cp.exitCode !== 0) {
                    if (stderr && stderr.length > 0) {
                        if (!this.options.quiet) {
                            console.log(`'${cmd}' error:${os.EOL}${stderr}`);
                        }
                        this.emitConsoleOutput(targetName, stderr);
                    }

                    if (cp.exitCode === null) {
                        reject(new Error(`'${cmd}' exited with signal: ${cp.signalCode}`));
                    } else {
                        reject(new Error(`'${cmd}' exited with code: ${cp.exitCode}`));
                    }
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Executes the specified command as a child process.
     * @param {string} cmd The command to execute.
     * @param {boolean=} quiet Disables printing to the standard output and standard error.
     * @param {number=} maxBuffer The maximum size of the stdout and stderr buffers (default is 200 * 1024).
     * @return {Promise} A promise object that will resolve with the contents of stdout after the command was executed successfully.
     * @example
     * const targets = {
     *     'less': function() {
     *         return LLBuild.executeCommand('less style.less');
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('less');
     */
    static executeCommand(cmd, quiet, maxBufferSize) {
        return new LLBuild(null, { quiet: quiet, maxBufferSize: maxBufferSize }).executeCommand(cmd, 'exec');
    }

    /**
     * Creates a directory recursively.
     * @param {string} path The path of the directory to create.
     * @param {String} targetName The target the operation is associated with, or null.
     * @return {Promise} A promise object that will resolve after the directory was created successfully.
     * @example
     * const targets = {
     *     'mkdir': function() {
     *         return LLBuild.mkdir(path.resolve(__dirname, 'output'));
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('mkdir');
     */
    mkdirp(path, targetName) {
        this.print(`mkdir -p ${path}`, targetName);
        return mkdirp(path).then(() => Promise.resolve());
    }

    /**
     * Creates a directory recursively.
     * @param {string} path The path of the directory to create.
     * @param {boolean=} quiet Disables printing to the standard output.
     * @return {Promise} A promise object that will resolve after the directory was created successfully.
     * @example
     * const targets = {
     *     'mkdir': function() {
     *         return LLBuild.mkdir(path.resolve(__dirname, 'output'));
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('mkdir');
     */
    static mkdirp(path, quiet) {
        return new LLBuild(null, { quiet: quiet }).mkdirp(path, 'mkdirp');
    }
    
    /**
     * Recursively removes a file or directory.
     * @param {string} path The path of the file or directory to remove.
     * @param {string} targetName The target the operation is associated with, or null.
     * @return {Promise} A promise object that will resolve after the file or directory was removed successfully.
     * @example
     * const targets = {
     *     'rmrf': function() {
     *         return LLBuild.rmrf(path.resolve(__dirname, 'output'));
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('rmrf');
     */
    rmrf(path, targetName) {
        return new Promise((resolve, reject) => {
            this.print(`rm -rf ${path}`, targetName);
            
            rimraf(path, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Recursively removes a file or directory.
     * @param {string} path The path of the file or directory to remove.
     * @param {boolean=} quiet Disables printing to the standard output.
     * @return {Promise} A promise object that will resolve after the file or directory was removed successfully.
     * @example
     * const targets = {
     *     'rmrf': function() {
     *         return LLBuild.rmrf(path.resolve(__dirname, 'output'));
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('rmrf');
     */
    static rmrf(path, quiet) {
        return new LLBuild(null, { quiet: quiet }).rmrf(path, 'rmrf');
    }

    /**
     * Prints the specified content to the standard output.
     * @param {string} content The content to be printed.
     * @param {string=} targetName The target the message is associated with, or null.
     */
    print(content, targetName) {
        if (!this.options.quiet) {
            console.log(content);
        }

        this.emitConsoleOutput(targetName, content);
    }
}

module.exports = LLBuild;

