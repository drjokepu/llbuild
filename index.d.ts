type EventType = 'targetExecutionStarted' | 'targetExecutionCompleted' | 'targetExecutionFailed';

declare namespace llbuild {
    /** Describes a build target. */
    type Target = string | boolean | TargetRunner | TargetCollection | null | undefined;
    type Context = any;

    /** A callback function responsible for building a target. */
    type TargetRunner = (builder: LLBuild, context: Context | null | undefined) => Promise<void>;

    interface TargetCollection {
        [idx: number]: Target
    }

    interface TargetSet {
        [key: string]: Target;
    }

    interface TargetExecutionStartedEventArgs {
        targetName: string;
    }

    interface TargetExecutionCompletedEventArgs {
        targetName: string;
    }

    interface TargetExecutionFailedEventArgs {
        targetName: string;
        err: Error;
    }

    class LLBuild {
        /**
         * Creates a new builder instance.
         * @param targets An optional object with string keys representing the target names and the associated values representing the targets.
         */
        constructor(targets: TargetSet);

        /**
         * @param target The target to execute.
         * @param context An optional context object to pass in to target runner callbacks.
         */
        executeTarget(target: Target, context?: Context | null | undefined): Promise<void>;

        /**
         * Parses the command line arguments and executes the selected target.
         * @param context An optional context object to pass in to the target runner callbacks.
         */
        runArgs(context?: Context | null | undefined): Promise<void>;

        /**
         * Adds the listener function for the targetExecutionStarted event.
         * @param eventName The name of the event.
         * @param listener The callback function.
         */
        addListener(eventName: 'targetExecutionStarted', listener: (ev: TargetExecutionStartedEventArgs) => void): void;

        /**
         * Adds the listener function for the targetExecutionStarted event.
         * @param eventName The name of the event.
         * @param listener The callback function.
         */
        addListener(eventName: 'targetExecutionCompleted', listener: (ev: TargetExecutionCompletedEventArgs) => void): void;

        /**
         * Adds the listener function for the targetExecutionStarted event.
         * @param eventName The name of the event.
         * @param listener The callback function.
         */
        addListener(eventName: 'targetExecutionFailed', listener: (ev: TargetExecutionFailedEventArgs) => void): void;

        /**
         * Removes the specified listener from the event named eventName.
         * @param eventName The name of the event.
         * @param listener The callback function.
         */
        removeListener(eventName: EventType, listener: Function): void;

        /** Removes all listeners. */
        removeAllListeners(): void;

        /**
         * Executes the specified command as a child process.
         * @param cmd The command to execute.
         * @param quiet Disables printing to the standard output and standard error.
         * @param maxBuffer The maximum size of the stdout and stderr buffers (default is 200 * 1024).
         */
        static executeCommand(cmd: string, quiet?: boolean, maxBuffer?: number): Promise<void>;

        /**
         * Creates a directory recursively.
         * @param path The path of the directory to create.
         * @param quiet Disables printing to the standard output.
         */
        static mkdirp(path: string, quiet?: boolean): Promise<void>;

        /**
         * Recursively removes a file or directory.
         * @param path The path of the file or directory to remove.
         * @param quiet Disables printing to the standard output.
         */
        static rmrf(path: string, quiet?: boolean): Promise<void>;
    }

    module LLBuild {

    }
}

declare module 'llbuild' {
    // var ll: llbuild.LLBuild;
    export = llbuild.LLBuild;
}