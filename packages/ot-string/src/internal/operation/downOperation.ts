import { Result } from '@kizahasi/result';
import {
    r,
    i,
    d,
    insert$,
    delete$,
    retain,
    invert as invertCore,
    compose as composeCore,
    ComposeAndTransformError,
    Operation,
    OperationBuilder,
    PositiveInt,
    ApplyError,
} from '@kizahasi/ot-core';
import { NonEmptyString } from '../nonEmptyString';
import * as TextTwoWayOperation from './twoWayOperation';
import * as TextUpOperation from './upOperation';
import { downFactory } from '../operationBuilderFactory';

export type DownOperation = Operation<PositiveInt, NonEmptyString>;
export type DownOperationUnit =
    | {
          t: typeof r;
          r: number;
      }
    | {
          t: typeof i;
          i: number;
      }
    | {
          t: typeof d;
          d: string;
      };

export const applyBack = ({
    nextState,
    downOperation,
}: {
    nextState: string;
    downOperation: DownOperation;
}): Result<string, ApplyError<NonEmptyString, PositiveInt>> => {
    return TextUpOperation.apply({
        prevState: nextState,
        upOperation: invertCore(downOperation),
    });
};

export const applyBackAndRestore = ({
    nextState,
    downOperation,
}: {
    nextState: string;
    downOperation: DownOperation;
}): Result<
    { prevState: string; restored: TextTwoWayOperation.TwoWayOperation },
    ApplyError<NonEmptyString, PositiveInt>
> => {
    const invertedResult = TextUpOperation.applyAndRestore({
        prevState: nextState,
        upOperation: invertCore(downOperation),
    });
    if (invertedResult.isError) {
        return invertedResult;
    }
    return Result.ok({
        prevState: invertedResult.value.nextState,
        restored: invertCore(invertedResult.value.restored),
    });
};

export const compose = ({
    first,
    second,
}: {
    first: DownOperation;
    second: DownOperation;
}): Result<DownOperation, ComposeAndTransformError<PositiveInt, NonEmptyString>> => {
    const result = composeCore({
        first: Array.from(new OperationBuilder(downFactory, first).toUnits()),
        second: Array.from(new OperationBuilder(downFactory, second).toUnits()),
        factory: downFactory,
        splitInsert: (target, deleteCount) => [
            deleteCount,
            new PositiveInt(target.value - deleteCount.value),
        ],
        splitDelete: (str, index) => [
            new NonEmptyString(str.value.substring(0, index.value)),
            new NonEmptyString(str.value.substring(index.value)),
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

export const invert = (source: DownOperation): Operation<NonEmptyString, PositiveInt> =>
    invertCore(source);

export const toUnit = (source: DownOperation): DownOperationUnit[] => {
    return Array.from(new OperationBuilder(downFactory, source).toUnits()).map(unit => {
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
    source: ReadonlyArray<DownOperationUnit | TextTwoWayOperation.TwoWayOperationUnit>
): DownOperation => {
    const builder = new OperationBuilder<PositiveInt, NonEmptyString>(downFactory);
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
                const insert = typeof unit.i === 'string' ? unit.i.length : unit.i;
                const insertAsPositiveInt = PositiveInt.tryCreate(insert);
                if (insertAsPositiveInt == null) {
                    continue;
                }
                builder.insert(insertAsPositiveInt);
                break;
            }
            case d: {
                const del = unit.d;
                const delAsPositiveInt = NonEmptyString.tryCreate(del);
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
