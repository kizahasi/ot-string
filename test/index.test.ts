import {
    insert$,
    NonEmptyString,
    PositiveInt,
    TextDownOperation,
    TextTwoWayOperation,
    TextUpOperation,
} from '../dist/index';
import fc from 'fast-check';

// TODO: apply以外の異常系のテスト

it('tests diff and apply', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), (first, second) => {
            const twoWayOperation = TextTwoWayOperation.diff({ first, second });
            const upOperation = TextTwoWayOperation.toUpOperation(
                twoWayOperation
            );
            const actual = TextUpOperation.apply({
                prevState: first,
                action: upOperation,
            });
            if (actual.isError === true) {
                throw actual.error;
            }
            expect(actual.value).toEqual(second);
        })
    );
});

test.each(['xx', 'xxxx'])(
    'tests apply but text is too short/long',
    (text: string) => {
        const operation: TextUpOperation.Operation = {
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
        const actual = TextUpOperation.apply({
            prevState: text,
            action: operation,
        });
        expect(actual.isError).toBe(true);
    }
);

it('tests apply but text is too short', () => {
    const text = 'xxxx';
    const operation: TextUpOperation.Operation = {
        body: [
            {
                firstRetain: new PositiveInt(3),
                secondEdit: { type: insert$, insert: new NonEmptyString('Y') },
            },
        ],
    };
    const actual = TextUpOperation.apply({
        prevState: text,
        action: operation,
    });
    expect(actual.isError).toBe(true);
});

it('tests applyAndRestore', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), (first, second) => {
            const twoWayOperation = TextTwoWayOperation.diff({ first, second });
            const upOperation = TextTwoWayOperation.toUpOperation(
                twoWayOperation
            );
            const actual = TextUpOperation.applyAndRestore({
                prevState: first,
                action: upOperation,
            });
            if (actual.isError === true) {
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
            const first = TextTwoWayOperation.toUpOperation(
                TextTwoWayOperation.diff(firstPair)
            );
            const second = TextTwoWayOperation.toUpOperation(
                TextTwoWayOperation.diff(secondPair)
            );
            const composed = TextUpOperation.compose({ first, second });
            if (composed.isError === true) {
                throw composed.error;
            }
            const expected = (() => {
                const firstApplied = TextUpOperation.apply({
                    prevState: firstPair.first,
                    action: first,
                });
                if (firstApplied.isError === true) {
                    throw firstApplied.error;
                }
                const secondApplied = TextUpOperation.apply({
                    prevState: firstApplied.value,
                    action: second,
                });
                if (secondApplied.isError === true) {
                    throw secondApplied.error;
                }
                return secondApplied.value;
            })();
            const actual = TextUpOperation.apply({
                prevState: firstPair.first,
                action: composed.value,
            });
            if (actual.isError === true) {
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
            const first = TextTwoWayOperation.diff(firstPair);
            const second = TextTwoWayOperation.diff(secondPair);
            const xform = TextTwoWayOperation.serverTransform({
                first,
                second,
            });
            if (xform.isError === true) {
                throw xform.error;
            }
            const result1 = (() => {
                const firstApplied = TextUpOperation.apply({
                    prevState: root,
                    action: TextTwoWayOperation.toUpOperation(first),
                });
                if (firstApplied.isError === true) {
                    throw firstApplied.error;
                }
                const secondApplied = TextUpOperation.apply({
                    prevState: firstApplied.value,
                    action: TextTwoWayOperation.toUpOperation(
                        xform.value.secondPrime
                    ),
                });
                if (secondApplied.isError === true) {
                    throw secondApplied.error;
                }
                const firstAppliedPrime = TextUpOperation.apply({
                    prevState: secondApplied.value,
                    action: TextDownOperation.invert(
                        TextTwoWayOperation.toDownOperation(
                            xform.value.secondPrime
                        )
                    ),
                });
                expect(firstApplied).toEqual(firstAppliedPrime);
                return secondApplied.value;
            })();
            const result2 = (() => {
                const secondApplied = TextUpOperation.apply({
                    prevState: root,
                    action: TextTwoWayOperation.toUpOperation(second),
                });
                if (secondApplied.isError === true) {
                    throw secondApplied.error;
                }
                const firstApplied = TextUpOperation.apply({
                    prevState: secondApplied.value,
                    action: TextTwoWayOperation.toUpOperation(
                        xform.value.firstPrime
                    ),
                });
                if (firstApplied.isError === true) {
                    throw firstApplied.error;
                }
                const secondAppliedPrime = TextUpOperation.apply({
                    prevState: firstApplied.value,
                    action: TextDownOperation.invert(
                        TextTwoWayOperation.toDownOperation(
                            xform.value.firstPrime
                        )
                    ),
                });
                expect(secondApplied).toEqual(secondAppliedPrime);
                return firstApplied.value;
            })();
            expect(result1).toEqual(result2);
        })
    );
});
