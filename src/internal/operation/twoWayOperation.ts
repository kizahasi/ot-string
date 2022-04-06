import { Result } from '@kizahasi/result';
import { diff_match_patch } from 'diff-match-patch';
import { r, i, d, insert$, delete$, retain } from '../const';
import { transformCore } from '../core';
import { ComposeAndTransformError } from '../error';
import { NonEmptyString } from '../nonEmptyString';
import { PositiveInt } from '../positiveInt';
import { twoWayFactory } from '../util/factory';
import { TextOperation, mapTextOperation } from '../util/textOperation';
import { TextOperationBuilder } from '../util/textOperationBuilder';

export type TwoWayOperation = TextOperation<NonEmptyString, NonEmptyString>;
export type TwoWayOperationUnit =
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
          d: string;
      };

export const diff = ({
    prevState,
    nextState,
}: {
    prevState: string;
    nextState: string;
}): TwoWayOperation => {
    const builder = new TextOperationBuilder<NonEmptyString, NonEmptyString>(twoWayFactory);
    const dmp = new diff_match_patch();
    dmp.diff_main(prevState, nextState).forEach(([diffType, diff]) => {
        switch (diffType) {
            case -1:
                builder.delete(new NonEmptyString(diff));
                break;
            case 0:
                builder.retain(new PositiveInt(diff.length));
                break;
            case 1:
                builder.insert(new NonEmptyString(diff));
                break;
        }
    });
    return builder.build();
};

export const transform = ({
    first,
    second,
}: {
    first: TwoWayOperation;
    second: TwoWayOperation;
}): Result<
    { firstPrime: TwoWayOperation; secondPrime: TwoWayOperation },
    ComposeAndTransformError<NonEmptyString, NonEmptyString>
> => {
    const result = transformCore({
        first: Array.from(new TextOperationBuilder(twoWayFactory, first).toUnits()),
        second: Array.from(new TextOperationBuilder(twoWayFactory, second).toUnits()),
        factory: twoWayFactory,
        splitDelete: (target, deleteCount) => [
            new NonEmptyString(target.value.substring(0, deleteCount.value)),
            new NonEmptyString(target.value.substring(deleteCount.value)),
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

export const toUnit = (source: TwoWayOperation): TwoWayOperationUnit[] => {
    return Array.from(new TextOperationBuilder(twoWayFactory, source).toUnits()).map(unit => {
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

export const ofUnit = (source: ReadonlyArray<TwoWayOperationUnit>): TwoWayOperation => {
    const builder = new TextOperationBuilder<NonEmptyString, NonEmptyString>(twoWayFactory);
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
                const insertAsNonEpmtyString = NonEmptyString.tryCreate(insert);
                if (insertAsNonEpmtyString == null) {
                    continue;
                }
                builder.insert(insertAsNonEpmtyString);
                break;
            }
            case d: {
                const del = unit.d;
                const delAsNonEmptyString = NonEmptyString.tryCreate(del);
                if (delAsNonEmptyString == null) {
                    continue;
                }
                builder.delete(delAsNonEmptyString);
                break;
            }
        }
    }
    return builder.build();
};

export const toUpOperation = (
    source: TwoWayOperation
): TextOperation<NonEmptyString, PositiveInt> => {
    return mapTextOperation({
        source,
        mapInsert: insert => insert,
        mapDelete: del => del.length,
    });
};

export const toDownOperation = (
    source: TwoWayOperation
): TextOperation<PositiveInt, NonEmptyString> => {
    return mapTextOperation({
        source,
        mapInsert: insert => insert.length,
        mapDelete: del => del,
    });
};
