import { Option } from '@kizahasi/option';
import { Result } from '@kizahasi/result';
import { r, i, d, insert$, delete$, retain } from '../const';
import { composeCore, transformCore, invertCore, applyAndRestoreCore } from '../core';
import { ApplyError, ComposeAndTransformError } from '../error';
import { NonEmptyString } from '../nonEmptyString';
import { PositiveInt } from '../positiveInt';
import { upFactory, twoWayFactory } from '../util/factory';
import { TextOperation } from '../util/textOperation';
import { TextOperationBuilder } from '../util/textOperationBuilder';
import * as TextTwoWayOperation from './twoWayOperation';

export type Operation = TextOperation<NonEmptyString, PositiveInt>;
export type OperationUnit =
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

export const apply = ({
    prevState,
    action,
}: {
    prevState: string;
    action: Operation;
}): Result<string, ApplyError<PositiveInt>> => {
    const result = applyAndRestoreCore({
        state: prevState,
        action: Array.from(new TextOperationBuilder(upFactory, action).toIterable()),
        getDeleteLength: del => del,
        mapping: () => Option.some(undefined),
    });
    if (result.isError) {
        return result;
    }
    return Result.ok(result.value.newState);
};

export const applyAndRestore = ({
    prevState,
    action,
}: {
    prevState: string;
    action: Operation;
}): Result<
    { nextState: string; restored: TextTwoWayOperation.Operation },
    ApplyError<PositiveInt>
> => {
    const result = applyAndRestoreCore({
        state: prevState,
        action: Array.from(new TextOperationBuilder(upFactory, action).toIterable()),
        getDeleteLength: del => del,
        restoreOption: {
            factory: twoWayFactory,
        },
        mapping: ({ actual }) => Option.some(actual),
    });
    if (result.isError) {
        return result;
    }
    if (result.value.restored === undefined) {
        throw new Error('this should not happen');
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
    first: Operation;
    second: Operation;
}): Result<Operation, ComposeAndTransformError<NonEmptyString, PositiveInt>> => {
    const result = composeCore({
        first: Array.from(new TextOperationBuilder(upFactory, first).toUnits()),
        second: Array.from(new TextOperationBuilder(upFactory, second).toUnits()),
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
    first: Operation;
    second: Operation;
}): Result<
    { firstPrime: Operation; secondPrime: Operation },
    ComposeAndTransformError<NonEmptyString, PositiveInt>
> => {
    const result = transformCore({
        first: Array.from(new TextOperationBuilder(upFactory, first).toUnits()),
        second: Array.from(new TextOperationBuilder(upFactory, second).toUnits()),
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

export const invert = (source: Operation): TextOperation<PositiveInt, NonEmptyString> =>
    invertCore(source);

export const toUnit = (source: Operation): OperationUnit[] => {
    return Array.from(new TextOperationBuilder(upFactory, source).toUnits()).map(unit => {
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
    source: ReadonlyArray<OperationUnit | TextTwoWayOperation.OperationUnit>
): Operation => {
    const builder = new TextOperationBuilder<NonEmptyString, PositiveInt>(upFactory);
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
