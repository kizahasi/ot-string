import { Result } from '@kizahasi/result';
import { retain, delete$, insert$, edit } from '../const';
import {
    ApplyError,
    ComposeAndTransformErrorBase,
    deleteValueNotMatch,
    secondTooLong,
    secondTooShort,
    stateTooLong,
    stateTooShort,
} from '../error';
import { PositiveInt } from '../positiveInt';
import { invertEditElement } from '../operationBuilder/editElement';
import { OperationBuilderFactory } from '../operationBuilder/operationBuilderFactory';
import { Operation } from '../operationBuilder/operation';
import { OperationBuilder } from '../operationBuilder/operationBuilder';
import { invertOperationElement } from '../operationBuilder/operationElement';
import {
    OperationUnit,
    nextLengthOfOperationUnitArray,
    prevLengthOfOperationUnitArray,
} from '../operationBuilder/operationUnit';
import {
    OperationArrayElement,
    prevLengthOfOperationElementArray,
} from '../operationBuilder/operationArrayElement';
import { Option } from '@kizahasi/option';

type InsertParams<TState, TInsert> = {
    /** A state to be updated. Do NOT update this value destuctively. */
    state: TState;

    /** The index of the first element to be deleted. */
    start: number;

    /** The elements to add to the state, beginning from `start`. If `None`, no elements are added. */
    replacement: Option<TInsert>;
};

type ReplaceParams<TState, TInsert> = InsertParams<TState, TInsert> & {
    /** The number of elements in the array to remove from `start`. */
    deleteCount: PositiveInt;
};

type InsertReturnType<TState> = {
    /** The updated state. */
    newState: TState;
};

type ReplaceReturnType<TState, TInsert> = InsertReturnType<TState> & {
    /** Deleted elements. */
    deleted: TInsert;
};

type ReplaceStrategy<TState, TInsert> = {
    insert: (args: InsertParams<TState, TInsert>) => InsertReturnType<TState>;
    replace: (args: ReplaceParams<TState, TInsert>) => ReplaceReturnType<TState, TInsert>;
};

const replaceState = <TState, TInsert>({
    source,
    start,
    deleteCount,
    replacement,
    getLength,
    insert,
    replace,
}: {
    source: TState;
    start: number;
    deleteCount: number;
    /** The elements to add to the state, beginning from `start`. If `None`, no elements are added. */
    replacement: Option<TInsert>;
    getLength: (state: TState) => number;
} & ReplaceStrategy<TState, TInsert>): {
    newState: TState;
    deleted: Option<TInsert>;
} | null => {
    if (getLength(source) < start + deleteCount) {
        return null;
    }

    const deleteCountP = PositiveInt.tryCreate(deleteCount);
    if (deleteCountP == null) {
        const result = insert({ state: source, start, replacement });
        return {
            newState: result.newState,
            deleted: Option.none(),
        };
    }
    const result = replace({ state: source, start, replacement, deleteCount: deleteCountP });
    return {
        newState: result.newState,
        deleted: Option.some(result.deleted),
    };
};

export const applyAndRestore = <TState, TInsert, TDelete1, TDelete2>({
    state,
    action,
    getStateLength,
    getInsertLength,
    getDeleteLength,
    restoreOption,
    mapping,
    replace,
    insert,
}: {
    state: TState;
    action: ReadonlyArray<OperationArrayElement<TInsert, TDelete1>>;
    getStateLength(state: TState): number;
    getInsertLength(insert: TInsert): number;
    getDeleteLength(del: TDelete1): PositiveInt;

    // restoreOptionがundefined ⇔ 戻り値のrestoredがnon-undefined
    restoreOption?: {
        factory: OperationBuilderFactory<TInsert, TDelete2>;
    };

    // Noneを返すと、expectedとactualが異なるとみなしてエラーになる。expectedがPositiveIntなどのときは常にSomeを返せばよい。
    // restoreOption === undefinedのとき、TDelete2は使われないのでOkの値は何でもいい。
    mapping: (params: { expected: TDelete1; actual: TInsert }) => Option<TDelete2>;
} & ReplaceStrategy<TState, TInsert>): Result<
    { newState: TState; restored?: Operation<TInsert, TDelete2> },
    ApplyError<TInsert, TDelete1>
> => {
    const prevLength = prevLengthOfOperationElementArray(action, getDeleteLength);
    if (getStateLength(state) < prevLength) {
        return Result.error({ type: stateTooShort });
    }
    if (getStateLength(state) > prevLength) {
        return Result.error({ type: stateTooLong });
    }

    let result = state;
    let cursor = 0;
    const builder =
        restoreOption == null
            ? undefined
            : new OperationBuilder<TInsert, TDelete2>(restoreOption.factory);

    for (const act of action) {
        switch (act.type) {
            case retain: {
                cursor += act.retain.value;
                builder?.retain(act.retain);
                break;
            }
            case edit: {
                const replaceResult = replaceState({
                    source: result,
                    start: cursor,
                    deleteCount:
                        act.edit.type === insert$ ? 0 : getDeleteLength(act.edit.delete).value,
                    replacement:
                        act.edit.type === delete$ ? Option.none() : Option.some(act.edit.insert),
                    getLength: state => getStateLength(state),
                    insert,
                    replace,
                });
                if (replaceResult == null) {
                    return Result.error({
                        type: stateTooShort,
                    });
                }
                if (act.edit.type !== insert$) {
                    if (replaceResult.deleted.isNone) {
                        throw new Error('This should not happen.');
                    }
                    const mapped = mapping({
                        expected: act.edit.delete,
                        actual: replaceResult.deleted.value,
                    });
                    if (mapped.isNone) {
                        return Result.error({
                            type: deleteValueNotMatch,
                            startCharIndex: cursor,
                            expected: act.edit.delete,
                            actual: replaceResult.deleted.value,
                        });
                    }
                    builder?.delete(mapped.value);
                }
                if (act.edit.insert !== undefined) {
                    builder?.insert(act.edit.insert);
                }
                result = replaceResult.newState;
                cursor += act.edit.insert == null ? 0 : getInsertLength(act.edit.insert);
            }
        }
    }

    return Result.ok({ newState: result, restored: builder?.build() });
};

// 実装にあたって https://github.com/Operational-Transformation/ot.js/blob/e9a3a0e214dd6c001e25515274bae0842a8415f2/lib/text-operation.js#L238 を参考にした
export const compose = <TInsert, TDelete>({
    first: $first,
    second: $second,
    factory,
    splitDelete: splitDeleteCore,
    splitInsert: splitInsertCore,
}: {
    first: ReadonlyArray<OperationUnit<TInsert, TDelete>>;
    second: ReadonlyArray<OperationUnit<TInsert, TDelete>>;

    // 例:
    // ('foo', 1) -> [ 'f', 'oo' ]
    // (5, 2) -> [2, (5 - 2)]
    //
    // 範囲外のindexが渡されることはない。
    splitDelete: (target: TDelete, index: PositiveInt) => [TDelete, TDelete];

    // splitDeleteと同様。
    splitInsert: (target: TInsert, index: PositiveInt) => [TInsert, TInsert];

    factory: OperationBuilderFactory<TInsert, TDelete>;
}): Result<Operation<TInsert, TDelete>, ComposeAndTransformErrorBase> => {
    const nextLengthOfFirst = nextLengthOfOperationUnitArray($first, factory);
    const prevLengthOfSecond = prevLengthOfOperationUnitArray($second, factory);
    if (nextLengthOfFirst < prevLengthOfSecond) {
        return Result.error({ type: secondTooLong });
    }
    if (nextLengthOfFirst > prevLengthOfSecond) {
        return Result.error({ type: secondTooShort });
    }

    const first = Array.from($first);
    const second = Array.from($second);
    let firstShift: OperationUnit<TInsert, TDelete> | undefined = undefined;
    let secondShift: OperationUnit<TInsert, TDelete> | undefined = undefined;

    const builder = new OperationBuilder<TInsert, TDelete>(factory);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (firstShift === undefined) {
            firstShift = first.shift();
        }
        if (secondShift === undefined) {
            secondShift = second.shift();
        }

        if (firstShift === undefined) {
            if (secondShift === undefined) {
                return Result.ok(builder.build());
            }
            builder.onUnit(secondShift);
            secondShift = undefined;
            continue;
        }
        if (secondShift === undefined) {
            builder.onUnit(firstShift);
            firstShift = undefined;
            continue;
        }

        if (firstShift.type === delete$) {
            builder.delete(firstShift.delete);
            firstShift = undefined;
            continue;
        }

        if (secondShift.type === insert$) {
            builder.insert(secondShift.insert);
            secondShift = undefined;
            continue;
        }

        if (firstShift.type === retain) {
            if (secondShift.type === retain) {
                if (firstShift.retain.value < secondShift.retain.value) {
                    builder.retain(firstShift.retain);
                    secondShift = {
                        type: retain,
                        retain: new PositiveInt(secondShift.retain.value - firstShift.retain.value),
                    };
                    firstShift = undefined;
                    continue;
                }
                if (firstShift.retain.value === secondShift.retain.value) {
                    builder.retain(firstShift.retain);
                    firstShift = secondShift = undefined;
                    continue;
                }
                builder.retain(secondShift.retain);
                firstShift = {
                    type: retain,
                    retain: new PositiveInt(firstShift.retain.value - secondShift.retain.value),
                };
                secondShift = undefined;
                continue;
            }

            if (secondShift.type === delete$) {
                const secondShiftDeleteLength = factory.getDeleteLength(secondShift.delete);
                if (firstShift.retain.value < secondShiftDeleteLength.value) {
                    const [intersection, remaining] = splitDeleteCore(
                        secondShift.delete,
                        firstShift.retain
                    );
                    builder.delete(intersection);
                    secondShift = {
                        type: delete$,
                        delete: remaining,
                    };
                    firstShift = undefined;
                    continue;
                }
                if (firstShift.retain.value === secondShiftDeleteLength.value) {
                    builder.delete(secondShift.delete);
                    firstShift = secondShift = undefined;
                    continue;
                }
                builder.delete(secondShift.delete);
                firstShift = {
                    type: retain,
                    retain: new PositiveInt(
                        firstShift.retain.value - secondShiftDeleteLength.value
                    ),
                };
                secondShift = undefined;
                continue;
            }

            throw new Error('This should not happen.');
        }

        if (secondShift.type === retain) {
            const firstShiftInsertLength = factory.getInsertLength(firstShift.insert);
            if (firstShiftInsertLength.value < secondShift.retain.value) {
                builder.insert(firstShift.insert);
                secondShift = {
                    type: retain,
                    retain: new PositiveInt(
                        secondShift.retain.value - firstShiftInsertLength.value
                    ),
                };
                firstShift = undefined;
                continue;
            }
            if (firstShiftInsertLength.value === secondShift.retain.value) {
                builder.insert(firstShift.insert);
                firstShift = secondShift = undefined;
                continue;
            }
            const [intersection, remaining] = splitInsertCore(
                firstShift.insert,
                secondShift.retain
            );
            builder.insert(intersection);
            firstShift = {
                type: insert$,
                insert: remaining,
            };
            secondShift = undefined;
            continue;
        }

        const firstShiftInsertLength = factory.getInsertLength(firstShift.insert);
        const secondShiftDeleteLength = factory.getDeleteLength(secondShift.delete);
        if (firstShiftInsertLength.value < secondShiftDeleteLength.value) {
            const [, remaining] = splitDeleteCore(secondShift.delete, firstShiftInsertLength);
            firstShift = undefined;
            secondShift = {
                type: delete$,
                delete: remaining,
            };
            continue;
        }
        if (firstShiftInsertLength.value === secondShiftDeleteLength.value) {
            firstShift = secondShift = undefined;
            continue;
        }
        const [, remaining] = splitInsertCore(firstShift.insert, secondShiftDeleteLength);
        firstShift = {
            type: insert$,
            insert: remaining,
        };
        secondShift = undefined;
        continue;
    }
};

export const transform = <TInsert, TDelete>({
    first: $first,
    second: $second,
    factory,
    splitDelete: splitDeleteCore,
}: {
    first: ReadonlyArray<OperationUnit<TInsert, TDelete>>;
    second: ReadonlyArray<OperationUnit<TInsert, TDelete>>;

    // 例:
    // ('foo', 1) -> [ 'f', 'oo' ]
    // (5, 2) -> [2, (5 - 2)]
    //
    // 範囲外のindexが渡されることはない。
    splitDelete: (target: TDelete, index: PositiveInt) => [TDelete, TDelete];

    factory: OperationBuilderFactory<TInsert, TDelete>;
}): Result<
    {
        firstPrime: Operation<TInsert, TDelete>;
        secondPrime: Operation<TInsert, TDelete>;
    },
    ComposeAndTransformErrorBase
> => {
    const prevLengthOfFirst = prevLengthOfOperationUnitArray($first, factory);
    const prevLengthOfSecond = prevLengthOfOperationUnitArray($second, factory);
    if (prevLengthOfFirst < prevLengthOfSecond) {
        return Result.error({ type: secondTooLong });
    }
    if (prevLengthOfFirst > prevLengthOfSecond) {
        return Result.error({ type: secondTooShort });
    }

    const first = Array.from($first);
    const second = Array.from($second);
    let firstShift: OperationUnit<TInsert, TDelete> | undefined = undefined;
    let secondShift: OperationUnit<TInsert, TDelete> | undefined = undefined;

    const firstPrime = new OperationBuilder<TInsert, TDelete>(factory);
    const secondPrime = new OperationBuilder<TInsert, TDelete>(factory);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (firstShift === undefined) {
            firstShift = first.shift();
        }
        if (secondShift === undefined) {
            secondShift = second.shift();
        }

        if (firstShift === undefined) {
            if (secondShift === undefined) {
                return Result.ok({
                    firstPrime: firstPrime.build(),
                    secondPrime: secondPrime.build(),
                });
            }
            if (secondShift.type === insert$) {
                firstPrime.retain(factory.getInsertLength(secondShift.insert));
            }
            secondPrime.onUnit(secondShift);
            secondShift = undefined;
            continue;
        }
        if (secondShift === undefined) {
            firstPrime.onUnit(firstShift);
            if (firstShift.type === insert$) {
                secondPrime.retain(factory.getInsertLength(firstShift.insert));
            }
            firstShift = undefined;
            continue;
        }

        // insert, *

        if (firstShift.type === insert$) {
            firstPrime.insert(firstShift.insert);
            secondPrime.retain(factory.getInsertLength(firstShift.insert));
            firstShift = undefined;
            continue;
        }

        // *, insert

        if (secondShift.type === insert$) {
            firstPrime.retain(factory.getInsertLength(secondShift.insert));
            secondPrime.insert(secondShift.insert);
            secondShift = undefined;
            continue;
        }

        if (firstShift.type === retain) {
            if (secondShift.type === retain) {
                // retain, retain

                if (firstShift.retain.value < secondShift.retain.value) {
                    firstPrime.retain(firstShift.retain);
                    secondPrime.retain(firstShift.retain);
                    secondShift = {
                        type: retain,
                        retain: new PositiveInt(secondShift.retain.value - firstShift.retain.value),
                    };
                    firstShift = undefined;
                    continue;
                }
                if (firstShift.retain.value === secondShift.retain.value) {
                    firstPrime.retain(firstShift.retain);
                    secondPrime.retain(firstShift.retain);
                    firstShift = secondShift = undefined;
                    continue;
                }
                firstPrime.retain(secondShift.retain);
                secondPrime.retain(secondShift.retain);
                firstShift = {
                    type: retain,
                    retain: new PositiveInt(firstShift.retain.value - secondShift.retain.value),
                };
                secondShift = undefined;
                continue;
            }

            // retain, delete

            const secondShiftDeleteLength = factory.getDeleteLength(secondShift.delete);
            if (firstShift.retain.value < secondShiftDeleteLength.value) {
                const [intersection, newSecondShift] = splitDeleteCore(
                    secondShift.delete,
                    firstShift.retain
                );
                secondPrime.delete(intersection);
                firstShift = undefined;
                secondShift = {
                    type: delete$,
                    delete: newSecondShift,
                };
                continue;
            }

            if (firstShift.retain.value === secondShiftDeleteLength.value) {
                secondPrime.delete(secondShift.delete);
                firstShift = undefined;
                secondShift = undefined;
                continue;
            }

            // firstShift.retain.value > secondShiftDeleteLength.value
            secondPrime.delete(secondShift.delete);
            firstShift = {
                type: retain,
                retain: new PositiveInt(firstShift.retain.value - secondShiftDeleteLength.value),
            };
            secondShift = undefined;
            continue;
        }

        if (secondShift.type === retain) {
            // delete, retain

            const firstShiftDeleteLength = factory.getDeleteLength(firstShift.delete);
            if (secondShift.retain.value < firstShiftDeleteLength.value) {
                const [intersection, newFirstShift] = splitDeleteCore(
                    firstShift.delete,
                    secondShift.retain
                );
                firstPrime.delete(intersection);
                firstShift = {
                    type: delete$,
                    delete: newFirstShift,
                };
                secondShift = undefined;
                continue;
            }

            if (secondShift.retain.value === firstShiftDeleteLength.value) {
                firstPrime.delete(firstShift.delete);
                firstShift = undefined;
                secondShift = undefined;
                continue;
            }

            // secondShift.retain.value > firstShiftDeleteLength.value
            firstPrime.delete(firstShift.delete);
            firstShift = undefined;
            secondShift = {
                type: retain,
                retain: new PositiveInt(secondShift.retain.value - firstShiftDeleteLength.value),
            };
            continue;
        }

        // delete, delete

        const firstShiftDeleteLength = factory.getDeleteLength(firstShift.delete);
        const secondShiftDeleteLength = factory.getDeleteLength(secondShift.delete);

        if (firstShiftDeleteLength.value < secondShiftDeleteLength.value) {
            const [, newSecondShift] = splitDeleteCore(secondShift.delete, firstShiftDeleteLength);
            firstShift = undefined;
            secondShift = {
                type: delete$,
                delete: newSecondShift,
            };
            continue;
        }

        if (firstShiftDeleteLength.value === secondShiftDeleteLength.value) {
            firstShift = undefined;
            secondShift = undefined;
            continue;
        }

        // firstShiftDeleteLength.value > secondShiftDeleteLength.value
        const [, newFirstShift] = splitDeleteCore(firstShift.delete, secondShiftDeleteLength);
        firstShift = {
            type: delete$,
            delete: newFirstShift,
        };
        secondShift = undefined;
        continue;
    }
};

export const invert = <T1, T2>(source: Operation<T1, T2>): Operation<T2, T1> => {
    return {
        headEdit:
            source.headEdit === undefined ? source.headEdit : invertEditElement(source.headEdit),
        body: source.body.map(body => invertOperationElement(body)),
        tailRetain: source.tailRetain,
    };
};
