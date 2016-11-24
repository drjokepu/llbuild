/// <reference path="../../index.d.ts" />
import * as LLBuild from 'llbuild';

const targets = {
    'all': ['test0', 'test1'],
    'test0': [true, 'test2', 'test3'],
    'test1': null,
    'test2': undefined,
    'test3': testRunner,
    'test4': testRunner2
};

function testRunner(): Promise<void> {
    return Promise.resolve<void>(undefined);
}

function testRunner2(builder: LLBuild, context: any): Promise<void> {
    builder.print('testRunner2');
    builder.print('test', 'all');
    return (
        builder
        .mkdirp('test9')
        .then(() => builder.executeCommand('touch test/hello.txt'))
        .then(() => builder.rmrf('test9'))
    );
}

const builder = new LLBuild(targets);

builder.addListener('targetExecutionStarted', (ev: llbuild.TargetExecutionStartedEventArgs) => { });
builder.addListener('targetExecutionStarted', () => { });
builder.addListener('targetExecutionCompleted', (ev: llbuild.TargetExecutionCompletedEventArgs) => { });
builder.addListener('targetExecutionCompleted', () => { });
builder.addListener('targetExecutionFailed', (ev: llbuild.TargetExecutionFailedEventArgs) => { });
builder.addListener('targetExecutionFailed', () => { });

builder.executeTarget('all', { q: 123 } ).then(() => { });