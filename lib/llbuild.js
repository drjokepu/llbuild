"use strict";

const childProcess = require('child_process');

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
 * new LLBuild(targets).runArgs().then(
 *     function() {
 *         console.log('Build complete.');
 *     },
 *     function(err) {
 *         console.err(`Build failed: ${err}`);
 *     })
 * );
 * */
class LLBuild {
    /**
     * Creates a new builder instance.
     * @param {Object.<string, LLBuild~Target>=} targets An optional object with string keys representing the target names and the associated values representing the targets.
     */
    constructor(targets) {
        this.targets = targets ? targets : {};
    }
    
    /**
     * Executes a target.
     * @param {LLBuild~Target} target The target to execute.
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
    executeTarget(target, context) {
        if (target === null || target === undefined || target === true || target === false) {
            return Promise.resolve();
        } else if (target.constructor === Array) {
            return this.executeArrayTarget(target, context);
        } else if (target.constructor === String) {
            return this.executeTargetWithName(target, context);
        } else if (target.constructor === Function) {
            return this.executeTargetRunner(target, context);
        } else {
            return Promise.reject(new Error(`Unsupported target type: ${typeof(target)}`));
        }
    }
    
    /**
     * Executes an array target.
     * @private
     * @param {Array.<LLBuild~Target>} targetArray The target to execute.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeArrayTarget(targetArray, context) {
        if (targetArray.length === 0) {
            return Promise.resolve();
        }
        
        if (targetArray[0] === true) {
            return this.executeArrayTargetSerially(targetArray, context);
        } else {
            return this.executeArrayTargetInParallel(targetArray, context);
        }
    }
    
    /**
     * Executes an array target serially.
     * @private
     * @param {Array.<LLBuild~Target>} targetArray The target to execute.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeArrayTargetSerially(targetArray, context) {
        if (targetArray.length < 2) {
            return Promise.resolve();
        }
        
        let promise = this.executeTarget(targetArray[1], context);
        for (let i = 2; i < targetArray.length; i++) {
            const nextTarget = targetArray[i];
            promise = promise.then(() => this.executeTarget(nextTarget, context));
        }
        
        return promise;
    }
    
    /**
     * Executes an array target in parallel.
     * @private
     * @param {Array.<LLBuild~Target>} targetArray The target to execute.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the target was executed successfully.
     */
    executeArrayTargetInParallel(targetArray, context) {
        return Promise.all(targetArray.map(t => this.executeTarget(t, context)));
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
            return this.executeTarget(target, context);
        }
    }
    
    /**
     * Executes ta target runner callback.
     * @private
     * @param {LLBuild~targetRunner} targetRunner The target runner callback to execute.
     * @param {Object=} context An optional context object to pass in to {@link LLBuild~targetRunner} callbacks.
     * @return {Promise} A promise object that will resolve after the callback was executed successfully.
     */
    executeTargetRunner(targetRunner, context) {
        return Promise.resolve().then(() => targetRunner(this, context));
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
     * Executes the specified command as a child process.
     * @param {string} cmd The command to execute.
     * @param {boolean=} quiet Disables printing the standard output and standard error of the command.
     * @return {Promise} A promise object that will resolve after the command was executed successfully.
     * @example
     * const LLBuild = require('llbuild');
     * 
     * const targets = {
     *     'less': function() {
     *         return LLBuild.executeCommand('less style.less');
     *     }
     * };
     *
     * new LLBuild(targets).executeTarget('less');
     */
    static executeCommand(cmd, quiet) {
        return new Promise(function(resolve, reject) {
            let exitCode = null;
	        let sig = null;

            if (!quiet) {
                console.log(cmd);
            }
            
            const cp = childProcess.exec(cmd, function(err, stdout, stderr) {
                if (err) {
                    reject(err);
                    return;
                }

                if (!quiet && stdout && stdout.length > 0) {
                    console.log(stdout);
                }

                if (exitCode !== 0) {
                    if (!quiet && stderr && stderr.length > 0) {
                        console.error(`'${cmd}' error:${os.EOL}${stderr}`);
                    }

                    if (exitCode === null) {
                        reject(new Error(`'${cmd}' exited with signal: ${sig}`));
                    } else {
                        reject(new Error(`'${cmd}' exited with code: ${exitCode}`));
                    }
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = LLBuild;

