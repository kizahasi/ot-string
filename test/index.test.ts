import {
    insert$,
    NonEmptyString,
    PositiveInt,
    diff,
    toUpOperation,
    apply,
    UpOperation,
    applyAndRestore,
    composeUpOperation,
    transformTwoWayOperation,
    invertDownOperation,
    toDownOperation,
} from '../src';
import fc from 'fast-check';

// TODO: apply以外の異常系のテスト

it('tests diff and apply', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), (first, second) => {
            const twoWayOperation = diff({ first, second });
            const upOperation = toUpOperation(twoWayOperation);
            const actual = apply({
                prevState: first,
                action: upOperation,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual(second);
        })
    );
});

test.each(['xx', 'xxxx'])('tests apply but text is too short/long', (text: string) => {
    const operation: UpOperation = {
        body: [
            {
                firstRetain: new PositiveInt(3),
                secondEdit: {
                    type: insert$,
                    insert: new NonEmptyString('Y'),
                },
            },
        ],
    };
    const actual = apply({
        prevState: text,
        action: operation,
    });
    expect(actual.isError).toBe(true);
});

it('tests apply but text is too short', () => {
    const text = 'xxxx';
    const operation: UpOperation = {
        body: [
            {
                firstRetain: new PositiveInt(3),
                secondEdit: { type: insert$, insert: new NonEmptyString('Y') },
            },
        ],
    };
    const actual = apply({
        prevState: text,
        action: operation,
    });
    expect(actual.isError).toBe(true);
});

it('tests applyAndRestore', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), (first, second) => {
            const twoWayOperation = diff({ first, second });
            const upOperation = toUpOperation(twoWayOperation);
            const actual = applyAndRestore({
                prevState: first,
                action: upOperation,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual({
                nextState: second,
                restored: twoWayOperation,
            });
        })
    );
});

it('tests compose', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
            const firstPair = { first: a, second: b };
            const secondPair = { first: b, second: c };
            const first = toUpOperation(diff(firstPair));
            const second = toUpOperation(diff(secondPair));
            const composed = composeUpOperation({ first, second });
            if (composed.isError) {
                throw composed.error;
            }
            const expected = (() => {
                const firstApplied = apply({
                    prevState: firstPair.first,
                    action: first,
                });
                if (firstApplied.isError) {
                    throw firstApplied.error;
                }
                const secondApplied = apply({
                    prevState: firstApplied.value,
                    action: second,
                });
                if (secondApplied.isError) {
                    throw secondApplied.error;
                }
                return secondApplied.value;
            })();
            const actual = apply({
                prevState: firstPair.first,
                action: composed.value,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual(expected);
        })
    );
});

it('tests transform', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (root, a, b) => {
            const firstPair = { first: root, second: a };
            const secondPair = { first: root, second: b };
            const first = diff(firstPair);
            const second = diff(secondPair);
            const xform = transformTwoWayOperation({
                first,
                second,
            });
            if (xform.isError) {
                throw xform.error;
            }
            const result1 = (() => {
                const firstApplied = apply({
                    prevState: root,
                    action: toUpOperation(first),
                });
                if (firstApplied.isError) {
                    throw firstApplied.error;
                }
                const secondApplied = apply({
                    prevState: firstApplied.value,
                    action: toUpOperation(xform.value.secondPrime),
                });
                if (secondApplied.isError) {
                    throw secondApplied.error;
                }
                const firstAppliedPrime = apply({
                    prevState: secondApplied.value,
                    action: invertDownOperation(toDownOperation(xform.value.secondPrime)),
                });
                expect(firstApplied).toEqual(firstAppliedPrime);
                return secondApplied.value;
            })();
            const result2 = (() => {
                const secondApplied = apply({
                    prevState: root,
                    action: toUpOperation(second),
                });
                if (secondApplied.isError) {
                    throw secondApplied.error;
                }
                const firstApplied = apply({
                    prevState: secondApplied.value,
                    action: toUpOperation(xform.value.firstPrime),
                });
                if (firstApplied.isError) {
                    throw firstApplied.error;
                }
                const secondAppliedPrime = apply({
                    prevState: firstApplied.value,
                    action: invertDownOperation(toDownOperation(xform.value.firstPrime)),
                });
                expect(secondApplied).toEqual(secondAppliedPrime);
                return firstApplied.value;
            })();
            expect(result1).toEqual(result2);
        })
    );
});
