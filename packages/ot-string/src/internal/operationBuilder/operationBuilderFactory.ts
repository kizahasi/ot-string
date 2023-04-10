import { NonEmptyString } from '../nonEmptyString';
import { PositiveInt } from '../positiveInt';

export type OperationBuilderFactory<TInsert, TDelete> = {
    getInsertLength(insert: TInsert): PositiveInt;
    getDeleteLength(del: TDelete): PositiveInt;
    concatInsert(first: TInsert, second: TInsert): TInsert;
    concatDelete(first: TDelete, second: TDelete): TDelete;
};

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
