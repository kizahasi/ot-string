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
    transformUpOperation,
    toDownOperation,
    applyBack,
    DownOperation,
    delete$,
    applyBackAndRestore,
    composeDownOperation,
    serializeTwoWayOperation,
    deserizalizeTwoWayOperation,
    serializeDownOperation,
    serializeUpOperation,
    deserializeDownOperation,
    deserializeUpOperation,
} from '../src';
import fc from 'fast-check';

// TODO: apply以外の異常系のテスト

describe('apply', () => {
    it('tests diff and apply', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (prevState, nextState) => {
                const twoWayOperation = diff({ prevState, nextState });
                const upOperation = toUpOperation(twoWayOperation);
                const actual = apply({
                    prevState,
                    upOperation,
                });
                if (actual.isError) {
                    throw actual.error;
                }
                expect(actual.value).toEqual(nextState);
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
            upOperation: operation,
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
            upOperation: operation,
        });
        expect(actual.isError).toBe(true);
    });
});

describe('applyBack', () => {
    it('tests diff and applyBack', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (prevState, nextState) => {
                const twoWayOperation = diff({ prevState, nextState });
                const downOperation = toDownOperation(twoWayOperation);
                const actual = applyBack({
                    nextState,
                    downOperation,
                });
                if (actual.isError) {
                    throw actual.error;
                }
                expect(actual.value).toEqual(prevState);
            })
        );
    });

    test.each(['xx', 'xxxx'])('tests applyBack but text is too short/long', (text: string) => {
        const operation: DownOperation = {
            body: [
                {
                    firstRetain: new PositiveInt(3),
                    secondEdit: {
                        type: delete$,
                        delete: new NonEmptyString('Y'),
                    },
                },
            ],
        };
        const actual = applyBack({
            nextState: text,
            downOperation: operation,
        });
        expect(actual.isError).toBe(true);
    });

    it('tests applyBack but text is too short', () => {
        const text = 'xxxx';
        const operation: DownOperation = {
            body: [
                {
                    firstRetain: new PositiveInt(3),
                    secondEdit: { type: delete$, delete: new NonEmptyString('Y') },
                },
            ],
        };
        const actual = applyBack({
            nextState: text,
            downOperation: operation,
        });
        expect(actual.isError).toBe(true);
    });
});

it('tests applyAndRestore', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), (prevState, nextState) => {
            const twoWayOperation = diff({ prevState, nextState });
            const upOperation = toUpOperation(twoWayOperation);
            const actual = applyAndRestore({
                prevState,
                upOperation,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual({
                nextState,
                restored: twoWayOperation,
            });
        })
    );
});

it('tests applyBackAndRestore', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), (prevState, nextState) => {
            const twoWayOperation = diff({ prevState, nextState });
            const downOperation = toDownOperation(twoWayOperation);
            const actual = applyBackAndRestore({
                nextState,
                downOperation,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual({
                prevState,
                restored: twoWayOperation,
            });
        })
    );
});

it('tests composeUpOperation', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (state1, state2, state3) => {
            const firstPair = { prevState: state1, nextState: state2 };
            const secondPair = { prevState: state2, nextState: state3 };
            const first = toUpOperation(diff(firstPair));
            const second = toUpOperation(diff(secondPair));
            const composed = composeUpOperation({ first, second });
            if (composed.isError) {
                throw composed.error;
            }
            const actual = apply({
                prevState: state1,
                upOperation: composed.value,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual(state3);
        })
    );
});

it('tests composeDownOperation', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (state1, state2, state3) => {
            const firstPair = { prevState: state1, nextState: state2 };
            const secondPair = { prevState: state2, nextState: state3 };
            const first = toDownOperation(diff(firstPair));
            const second = toDownOperation(diff(secondPair));
            const composed = composeDownOperation({ first, second });
            if (composed.isError) {
                throw composed.error;
            }
            const actual = applyBack({
                nextState: state3,
                downOperation: composed.value,
            });
            if (actual.isError) {
                throw actual.error;
            }
            expect(actual.value).toEqual(state1);
        })
    );
});

it('tests transformTwoWayOperation', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (root, a, b) => {
            const firstPair = { prevState: root, nextState: a };
            const secondPair = { prevState: root, nextState: b };
            const first = diff(firstPair);
            const second = diff(secondPair);
            const xform = transformTwoWayOperation({
                first,
                second,
            });
            if (xform.isError) {
                throw xform.error;
            }

            const root_first = apply({
                prevState: root,
                upOperation: toUpOperation(first),
            });
            if (root_first.isError) {
                throw root_first.error;
            }
            const root_first_secondPrime = apply({
                prevState: root_first.value,
                upOperation: toUpOperation(xform.value.secondPrime),
            });
            if (root_first_secondPrime.isError) {
                throw root_first_secondPrime.error;
            }
            const root_first_secondPrime_invertedSecondPrime = applyBack({
                nextState: root_first_secondPrime.value,
                downOperation: toDownOperation(xform.value.secondPrime),
            });
            expect(root_first).toEqual(root_first_secondPrime_invertedSecondPrime);

            const root_second = apply({
                prevState: root,
                upOperation: toUpOperation(second),
            });
            if (root_second.isError) {
                throw root_second.error;
            }
            const root_second_firstPrime = apply({
                prevState: root_second.value,
                upOperation: toUpOperation(xform.value.firstPrime),
            });
            if (root_second_firstPrime.isError) {
                throw root_second_firstPrime.error;
            }
            const root_second_firstPrime_invertedFirstPrime = applyBack({
                nextState: root_second_firstPrime.value,
                downOperation: toDownOperation(xform.value.firstPrime),
            });
            expect(root_second).toEqual(root_second_firstPrime_invertedFirstPrime);

            expect(root_first_secondPrime).toEqual(root_second_firstPrime);
        })
    );
});

it('tests transformUpOperation', () => {
    fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (root, a, b) => {
            const firstPair = { prevState: root, nextState: a };
            const secondPair = { prevState: root, nextState: b };
            const first = toUpOperation(diff(firstPair));
            const second = toUpOperation(diff(secondPair));
            const xform = transformUpOperation({
                first,
                second,
            });
            if (xform.isError) {
                throw xform.error;
            }

            const root_first = apply({
                prevState: root,
                upOperation: first,
            });
            if (root_first.isError) {
                throw root_first.error;
            }
            const root_first_secondPrime = apply({
                prevState: root_first.value,
                upOperation: xform.value.secondPrime,
            });
            if (root_first_secondPrime.isError) {
                throw root_first_secondPrime.error;
            }

            const root_second = apply({
                prevState: root,
                upOperation: second,
            });
            if (root_second.isError) {
                throw root_second.error;
            }
            const root_second_firstPrime = apply({
                prevState: root_second.value,
                upOperation: xform.value.firstPrime,
            });
            if (root_second_firstPrime.isError) {
                throw root_second_firstPrime.error;
            }

            expect(root_first_secondPrime).toEqual(root_second_firstPrime);
        })
    );
});

describe('serialize and deserialize', () => {
    it('twoWayOperation', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (prevState, nextState) => {
                const operation = diff({ prevState, nextState });
                const serialized = serializeTwoWayOperation(operation);
                const deserialized = deserizalizeTwoWayOperation(serialized);
                expect(deserialized).toEqual(operation);
            })
        );
    });

    it('upOperation', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (prevState, nextState) => {
                const operation = toUpOperation(diff({ prevState, nextState }));
                const serialized = serializeUpOperation(operation);
                const deserialized = deserializeUpOperation(serialized);
                expect(deserialized).toEqual(operation);
            })
        );
    });

    it('downOperation', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (prevState, nextState) => {
                const operation = toDownOperation(diff({ prevState, nextState }));
                const serialized = serializeDownOperation(operation);
                const deserialized = deserializeDownOperation(serialized);
                expect(deserialized).toEqual(operation);
            })
        );
    });
});
