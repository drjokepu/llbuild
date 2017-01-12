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

LLBuild.executeCommand('touch test/exec_static0.txt');
LLBuild.executeCommand('touch test/exec_static0.txt', false);
LLBuild.executeCommand('touch test/exec_static0.txt', true, 4096);

LLBuild.mkdirp('test/test2');
LLBuild.mkdirp('test/test3', true);

LLBuild.rmrf('test/test4');
LLBuild.rmrf('test/test5', true);