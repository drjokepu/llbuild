/// <reference path="../../index.d.ts" />
import * as LLBuild from 'llbuild';

const targets = {
    'all': ['test0', 'test1'],
    'test0': [true, 'test2', 'test3'],
    'test1': null,
    'test2': undefined,
    'test3': testRunner
};

function testRunner(): Promise<void> {
    return Promise.resolve<void>(undefined);
}

const builder = new LLBuild(targets);
builder.executeTarget('all', { q: 123 } ).then(() => { });