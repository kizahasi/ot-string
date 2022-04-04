import { Option } from '@kizahasi/option';
import { Result } from '@kizahasi/result';
import { retain, edit, delete$, insert$ } from '../const';
import {
    ApplyError,
    ComposeAndTransformErrorBase,
    deleteStringNotMatch,
    secondTooLong,
    secondTooShort,
    stateTooLong,
    stateTooShort,
} from '../error';
import { NonEmptyString } from '../nonEmptyString';
import { PositiveInt } from '../positiveInt';
import { invertEditElement } from '../util/editElement';
import { Factory } from '../util/factory';
import { TextOperation } from '../util/textOperation';
import {
    TextOperationArrayElement,
    prevLengthOfTextOperationElementArray,
} from '../util/textOperationArrayElement';
import { TextOperationBuilder } from '../util/textOperationBuilder';
import { invertTextOperationElement } from '../util/textOperationElement';
import {
    TextOperationUnit,
    nextLengthOfTextOperationUnitArray,
    prevLengthOfTextOperationUnitArray,
} from '../util/textOperationUnit';

const replace = ({
    source,
    start,
    count,
    replacement,
}: {
    source: string;
    start: number;
    count: number;
    replacement: string;
}): { deleted: string; newValue: string } | null => {
    if (source.length < start + count) {
        return null;
    }
    const deleted = source.substring(start, start + count);
    return {
        newValue: source.substring(0, start) + replacement + source.substring(start + count),
        deleted,
    };
};

export const applyAndRestoreCore = <TDelete1, TDelete2>({
    state,
    action,
    getDeleteLength,
    restoreOption,
    mapping,
}: {
    state: string;
    action: ReadonlyArray<TextOperationArrayElement<NonEmptyString, TDelete1>>;
    getDeleteLength(del: TDelete1): PositiveInt;

    // restoreOptionがundefined ⇔ 戻り値のrestoredがnon-undefined
    restoreOption?: {
        factory: Factory<NonEmptyString, TDelete2>;
    };

    // Noneを返すと、expectedとactualが異なるとみなしてエラーになる。expectedがPositiveIntなどのときは常にSomeを返せばよい。
    // restoreOption === undefinedのとき、TDelete2は使われないのでOkの値は何でもいい。
    mapping: (params: { expected: TDelete1; actual: NonEmptyString }) => Option<TDelete2>;
}): Result<
    { newState: string; restored?: TextOperation<NonEmptyString, TDelete2> },
    ApplyError<TDelete1>
> => {
    const prevLength = prevLengthOfTextOperationElementArray(action, getDeleteLength);
    if (state.length < prevLength) {
        return Result.error({ type: stateTooShort });
    }
    if (state.length > prevLength) {
        return Result.error({ type: stateTooLong });
    }

    let result = state;
    let cursor = 0;
    const builder =
        restoreOption == null
            ? undefined
            : new TextOperationBuilder<NonEmptyString, TDelete2>(restoreOption.factory);

    for (const act of action) {
        switch (act.type) {
            case retain: {
                cursor += act.retain.value;
                builder?.retain(act.retain);
                break;
            }
            case edit: {
                const replacement = act.edit.insert?.value ?? '';
                const replaceResult = replace({
                    source: result,
                    start: cursor,
                    count: act.edit.delete == null ? 0 : getDeleteLength(act.edit.delete).value,
                    replacement,
                });
                if (replaceResult == null) {
                    return Result.error({
                        type: stateTooShort,
                    });
                }
                if (act.edit.delete != null) {
                    const deleted = new NonEmptyString(replaceResult.deleted);
                    const mapped = mapping({
                        expected: act.edit.delete,
                        actual: deleted,
                    });
                    if (mapped.isNone) {
                        return Result.error({
                            type: deleteStringNotMatch,
                            startCharIndex: cursor,
                            expected: act.edit.delete,
                            actual: deleted,
                        });
                    }
                    builder?.delete(mapped.value);
                }
                if (act.edit.insert !== undefined) {
                    builder?.insert(act.edit.insert);
                }
                result = replaceResult.newValue;
                cursor += replacement.length;
            }
        }
    }

    return Result.ok({ newState: result, restored: builder?.build() });
};

// 実装にあたって https://github.com/Operational-Transformation/ot.js/blob/e9a3a0e214dd6c001e25515274bae0842a8415f2/lib/text-operation.js#L238 を参考にした
export const composeCore = <TInsert, TDelete>({
    first: $first,
    second: $second,
    factory,
    splitDelete: splitDeleteCore,
    splitInsert: splitInsertCore,
}: {
    first: ReadonlyArray<TextOperationUnit<TInsert, TDelete>>;
    second: ReadonlyArray<TextOperationUnit<TInsert, TDelete>>;

    // 例:
    // ('foo', 1) -> [ 'f', 'oo' ]
    // (5, 2) -> [2, (5 - 2)]
    //
    // 範囲外のindexが渡されることはない。
    splitDelete: (target: TDelete, index: PositiveInt) => [TDelete, TDelete];

    // splitDeleteと同様。
    splitInsert: (target: TInsert, index: PositiveInt) => [TInsert, TInsert];

    factory: Factory<TInsert, TDelete>;
}): Result<TextOperation<TInsert, TDelete>, ComposeAndTransformErrorBase> => {
    const nextLengthOfFirst = nextLengthOfTextOperationUnitArray($first, factory);
    const prevLengthOfSecond = prevLengthOfTextOperationUnitArray($second, factory);
    if (nextLengthOfFirst < prevLengthOfSecond) {
        return Result.error({ type: secondTooLong });
    }
    if (nextLengthOfFirst > prevLengthOfSecond) {
        return Result.error({ type: secondTooShort });
    }

    const first = Array.from($first);
    const second = Array.from($second);
    let firstShift: TextOperationUnit<TInsert, TDelete> | undefined = undefined;
    let secondShift: TextOperationUnit<TInsert, TDelete> | undefined = undefined;

    const builder = new TextOperationBuilder<TInsert, TDelete>(factory);

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

export const transformCore = <TInsert, TDelete>({
    first: $first,
    second: $second,
    factory,
    splitDelete: splitDeleteCore,
}: {
    first: ReadonlyArray<TextOperationUnit<TInsert, TDelete>>;
    second: ReadonlyArray<TextOperationUnit<TInsert, TDelete>>;

    // 例:
    // ('foo', 1) -> [ 'f', 'oo' ]
    // (5, 2) -> [2, (5 - 2)]
    //
    // 範囲外のindexが渡されることはない。
    splitDelete: (target: TDelete, index: PositiveInt) => [TDelete, TDelete];

    factory: Factory<TInsert, TDelete>;
}): Result<
    {
        firstPrime: TextOperation<TInsert, TDelete>;
        secondPrime: TextOperation<TInsert, TDelete>;
    },
    ComposeAndTransformErrorBase
> => {
    const prevLengthOfFirst = prevLengthOfTextOperationUnitArray($first, factory);
    const prevLengthOfSecond = prevLengthOfTextOperationUnitArray($second, factory);
    if (prevLengthOfFirst < prevLengthOfSecond) {
        return Result.error({ type: secondTooLong });
    }
    if (prevLengthOfFirst > prevLengthOfSecond) {
        return Result.error({ type: secondTooShort });
    }

    const first = Array.from($first);
    const second = Array.from($second);
    let firstShift: TextOperationUnit<TInsert, TDelete> | undefined = undefined;
    let secondShift: TextOperationUnit<TInsert, TDelete> | undefined = undefined;

    const firstPrime = new TextOperationBuilder<TInsert, TDelete>(factory);
    const secondPrime = new TextOperationBuilder<TInsert, TDelete>(factory);

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

export const invertCore = <T1, T2>(source: TextOperation<T1, T2>): TextOperation<T2, T1> => {
    return {
        headEdit:
            source.headEdit === undefined ? source.headEdit : invertEditElement(source.headEdit),
        body: source.body.map(body => invertTextOperationElement(body)),
        tailRetain: source.tailRetain,
    };
};
