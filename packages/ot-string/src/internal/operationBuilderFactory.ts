import { OperationBuilderFactory, PositiveInt } from '@kizahasi/ot-core';
import { NonEmptyString } from './nonEmptyString';

export const upFactory: OperationBuilderFactory<NonEmptyString, PositiveInt> = {
    getInsertLength: x => x.length,
    getDeleteLength: x => x,
    concatInsert: (x, y) => x.concat(y),
    concatDelete: (x, y) => PositiveInt.add(x, y),
};

export const downFactory: OperationBuilderFactory<PositiveInt, NonEmptyString> = {
    getInsertLength: x => x,
    getDeleteLength: x => x.length,
    concatInsert: (x, y) => PositiveInt.add(x, y),
    concatDelete: (x, y) => x.concat(y),
};

export const twoWayFactory: OperationBuilderFactory<NonEmptyString, NonEmptyString> = {
    getInsertLength: x => x.length,
    getDeleteLength: x => x.length,
    concatInsert: (x, y) => x.concat(y),
    concatDelete: (x, y) => x.concat(y),
};
