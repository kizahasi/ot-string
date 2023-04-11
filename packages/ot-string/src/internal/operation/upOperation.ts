import { Result } from '@kizahasi/result';
import {
    r,
    i,
    d,
    insert$,
    delete$,
    retain,
    apply as applyCore,
    applyAndRestore as applyAndRestoreCore,
    compose as composeCore,
    transform as transformCore,
    invert as invertCore,
    ComposeAndTransformError,
    PositiveInt,
    Operation,
    OperationBuilder,
    ApplyError,
} from '@kizahasi/ot-core';
import { NonEmptyString } from '../nonEmptyString';
import * as TextTwoWayOperation from './twoWayOperation';
import { twoWayFactory, upFactory } from '../operationBuilderFactory';

export type UpOperation = Operation<NonEmptyString, PositiveInt>;
export type UpOperationUnit =
    | {
          t: typeof r;
          r: number;
      }
    | {
          t: typeof i;
          i: string;
      }
    | {
          t: typeof d;
          d: number;
      };

type InsertOrReplace = Pick<
    Parameters<typeof applyAndRestoreCore<string, NonEmptyString, NonEmptyString, undefined>>[0],
    'insert' | 'replace'
>;
const insertOrReplace: InsertOrReplace = {
    insert: ({ state, start, replacement }) => {
        return {
            newState: state.substring(0, start) + replacement.value + state.substring(start),
        };
    },
    replace: ({ state, start, deleteCount, replacement }) => {
        const deleted = state.substring(start, start + deleteCount.value);
        return {
            newState:
                state.substring(0, start) +
                (replacement.value?.value ?? '') +
                state.substring(start + deleteCount.value),
            deleted: new NonEmptyString(deleted),
        };
    },
};

export const apply = ({
    prevState,
    upOperation,
}: {
    prevState: string;
    upOperation: UpOperation;
}): Result<string, ApplyError<NonEmptyString, PositiveInt>> => {
    const result = applyCore({
        ...insertOrReplace,
        state: prevState,
        action: Array.from(new OperationBuilder(upFactory, upOperation).toIterable()),
        getStateLength: state => state.length,
        getInsertLength: insert => insert.length.value,
        getDeleteLength: del => del,
    });
    if (result.isError) {
        return result;
    }
    return Result.ok(result.value.newState);
};

export const applyAndRestore = ({
    prevState,
    upOperation,
}: {
    prevState: string;
    upOperation: UpOperation;
}): Result<
    { nextState: string; restored: TextTwoWayOperation.TwoWayOperation },
    ApplyError<NonEmptyString, PositiveInt>
> => {
    const result = applyAndRestoreCore({
        ...insertOrReplace,
        state: prevState,
        action: Array.from(new OperationBuilder(upFactory, upOperation).toIterable()),
        getStateLength: state => state.length,
        getInsertLength: insert => insert.length.value,
        getDeleteLength: del => del,
        factory: twoWayFactory,
        validateDeleted: ({ actual }) => Result.ok(actual),
    });
    if (result.isError) {
        return result;
    }
    return Result.ok({
        nextState: result.value.newState,
        restored: result.value.restored,
    });
};

export const compose = ({
    first,
    second,
}: {
    first: UpOperation;
    second: UpOperation;
}): Result<UpOperation, ComposeAndTransformError<NonEmptyString, PositiveInt>> => {
    const result = composeCore({
        first: Array.from(new OperationBuilder(upFactory, first).toUnits()),
        second: Array.from(new OperationBuilder(upFactory, second).toUnits()),
        factory: upFactory,
        splitInsert: (str, index) => [
            new NonEmptyString(str.value.substring(0, index.value)),
            new NonEmptyString(str.value.substring(index.value)),
        ],
        splitDelete: (target, deleteCount) => [
            deleteCount,
            new PositiveInt(target.value - deleteCount.value),
        ],
    });
    if (result.isError) {
        return Result.error({
            ...result.error,
            first,
            second,
        });
    }
    return result;
};

export const transform = ({
    first,
    second,
}: {
    first: UpOperation;
    second: UpOperation;
}): Result<
    { firstPrime: UpOperation; secondPrime: UpOperation },
    ComposeAndTransformError<NonEmptyString, PositiveInt>
> => {
    const result = transformCore({
        first: Array.from(new OperationBuilder(upFactory, first).toUnits()),
        second: Array.from(new OperationBuilder(upFactory, second).toUnits()),
        factory: upFactory,
        splitDelete: (target, deleteCount) => [
            deleteCount,
            new PositiveInt(target.value - deleteCount.value),
        ],
    });
    if (result.isError) {
        return Result.error({
            ...result.error,
            first,
            second,
        });
    }
    return result;
};

export const invert = (source: UpOperation): Operation<PositiveInt, NonEmptyString> =>
    invertCore(source);

export const toUnit = (source: UpOperation): UpOperationUnit[] => {
    return Array.from(new OperationBuilder(upFactory, source).toUnits()).map(unit => {
        switch (unit.type) {
            case insert$:
                return {
                    t: i,
                    i: unit.insert.value,
                } as const;
            case delete$:
                return {
                    t: d,
                    d: unit.delete.value,
                } as const;
            case retain:
                return {
                    t: r,
                    r: unit.retain.value,
                } as const;
        }
    });
};

export const ofUnit = (
    source: ReadonlyArray<UpOperationUnit | TextTwoWayOperation.TwoWayOperationUnit>
): UpOperation => {
    const builder = new OperationBuilder<NonEmptyString, PositiveInt>(upFactory);
    for (const unit of source) {
        if (unit == null) {
            continue;
        }
        switch (unit.t) {
            case r: {
                const retain = unit.r;
                const retainAsPositiveInt = PositiveInt.tryCreate(retain);
                if (retainAsPositiveInt == null) {
                    continue;
                }
                builder.retain(retainAsPositiveInt);
                break;
            }
            case i: {
                const insert = unit.i;
                const insertAsNonEmptyString = NonEmptyString.tryCreate(insert);
                if (insertAsNonEmptyString == null) {
                    continue;
                }
                builder.insert(insertAsNonEmptyString);
                break;
            }
            case d: {
                const del = typeof unit.d === 'string' ? unit.d.length : unit.d;
                const delAsPositiveInt = PositiveInt.tryCreate(del);
                if (delAsPositiveInt == null) {
                    continue;
                }
                builder.delete(delAsPositiveInt);
                break;
            }
        }
    }
    return builder.build();
};
