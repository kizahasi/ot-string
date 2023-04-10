import { insert$, delete$, replace$ } from '../const';
import { OperationBuilderFactory } from './operationBuilderFactory';
import { Insert, Delete, Replace } from '../type';

export type EditElement<TInsert, TDelete> =
    | Insert<TInsert>
    | Delete<TDelete>
    | Replace<TInsert, TDelete>;

export const prevLengthOfEditElement = <TInsert, TDelete>(
    source: EditElement<TInsert, TDelete>,
    factory: OperationBuilderFactory<TInsert, TDelete>
) => (source.delete === undefined ? 0 : factory.getDeleteLength(source.delete).value);

export const nextLengthOfEditElement = <TInsert, TDelete>(
    source: EditElement<TInsert, TDelete>,
    factory: OperationBuilderFactory<TInsert, TDelete>
) => (source.insert === undefined ? 0 : factory.getInsertLength(source.insert).value);

export const mapEditElement = <TInsert1, TInsert2, TDelete1, TDelete2>({
    source,
    mapInsert,
    mapDelete,
}: {
    source: EditElement<TInsert1, TDelete1>;
    mapInsert: (source: TInsert1) => TInsert2;
    mapDelete: (source: TDelete1) => TDelete2;
}): EditElement<TInsert2, TDelete2> => {
    switch (source.type) {
        case insert$:
            return {
                type: insert$,
                insert: mapInsert(source.insert),
            };
        case delete$:
            return {
                type: delete$,
                delete: mapDelete(source.delete),
            };
        case replace$:
            return {
                type: replace$,
                insert: mapInsert(source.insert),
                delete: mapDelete(source.delete),
            };
    }
};

export const mergeEditElement = <TInsert, TDelete>(
    first: EditElement<TInsert, TDelete>,
    second: EditElement<TInsert, TDelete>,
    concatInsert: (first: TInsert, second: TInsert) => TInsert,
    concatDelete: (first: TDelete, second: TDelete) => TDelete
): EditElement<TInsert, TDelete> => {
    switch (first.type) {
        case insert$:
            switch (second.type) {
                case insert$:
                    return {
                        type: insert$,
                        insert: concatInsert(first.insert, second.insert),
                    };
                case delete$:
                    return {
                        type: replace$,
                        insert: first.insert,
                        delete: second.delete,
                    };
                case replace$:
                    return {
                        type: replace$,
                        insert: concatInsert(first.insert, second.insert),
                        delete: second.delete,
                    };
            }
        case delete$:
            switch (second.type) {
                case insert$:
                    return {
                        type: replace$,
                        insert: second.insert,
                        delete: first.delete,
                    };
                case delete$:
                    return {
                        type: delete$,
                        delete: concatDelete(first.delete, second.delete),
                    };
                case replace$:
                    return {
                        type: replace$,
                        insert: second.insert,
                        delete: concatDelete(first.delete, second.delete),
                    };
            }
        case replace$:
            switch (second.type) {
                case insert$:
                    return {
                        type: replace$,
                        insert: concatInsert(first.insert, second.insert),
                        delete: first.delete,
                    };
                case delete$:
                    return {
                        type: replace$,
                        insert: first.insert,
                        delete: concatDelete(first.delete, second.delete),
                    };
                case replace$:
                    return {
                        type: replace$,
                        insert: concatInsert(first.insert, second.insert),
                        delete: concatDelete(first.delete, second.delete),
                    };
            }
    }
};

export const invertEditElement = <T1, T2>(source: EditElement<T1, T2>): EditElement<T2, T1> => {
    switch (source.type) {
        case insert$:
            return {
                type: delete$,
                delete: source.insert,
            };
        case delete$:
            return {
                type: insert$,
                insert: source.delete,
            };
        case replace$:
            return {
                type: replace$,
                insert: source.delete,
                delete: source.insert,
            };
    }
};
