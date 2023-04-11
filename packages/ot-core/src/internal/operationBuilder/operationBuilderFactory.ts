import { PositiveInt } from '../positiveInt';

export type OperationBuilderFactory<TInsert, TDelete> = {
    getInsertLength(insert: TInsert): PositiveInt;
    getDeleteLength(del: TDelete): PositiveInt;
    concatInsert(first: TInsert, second: TInsert): TInsert;
    concatDelete(first: TDelete, second: TDelete): TDelete;
};
