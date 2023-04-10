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

export const insertToEditElement = <TInsert, TDelete>(
    source: EditElement<TInsert, TDelete>,
    insert: TInsert,
    concat: (first: TInsert, second: TInsert) => TInsert
): EditElement<TInsert, TDelete> => {
    switch (source.type) {
        case insert$:
            return {
                type: insert$,
                insert: concat(source.insert, insert),
            };
        case delete$:
            return {
                type: replace$,
                insert: insert,
                delete: source.delete,
            };
        case replace$:
            return {
                type: replace$,
                insert: concat(source.insert, insert),
                delete: source.delete,
            };
    }
};

export const deleteToEditElement = <TInsert, TDelete>(
    source: EditElement<TInsert, TDelete>,
    del: TDelete,
    concat: (first: TDelete, second: TDelete) => TDelete
): EditElement<TInsert, TDelete> => {
    switch (source.type) {
        case insert$:
            return {
                type: replace$,
                insert: source.insert,
                delete: del,
            };
        case delete$:
            return {
                type: delete$,
                delete: concat(source.delete, del),
            };
        case replace$:
            return {
                type: replace$,
                insert: source.insert,
                delete: concat(source.delete, del),
            };
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
