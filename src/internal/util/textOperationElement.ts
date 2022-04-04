import { PositiveInt } from '../positiveInt';
import { EditElement, mapEditElement, invertEditElement } from './editElement';

export type TextOperationElement<TInsert, TDelete> = {
    firstRetain: PositiveInt;
    secondEdit: EditElement<TInsert, TDelete>;
};

export const mapTextOperationElement = <TInsert1, TInsert2, TDelete1, TDelete2>({
    source,
    mapInsert,
    mapDelete,
}: {
    source: TextOperationElement<TInsert1, TDelete1>;
    mapInsert: (source: TInsert1) => TInsert2;
    mapDelete: (source: TDelete1) => TDelete2;
}): TextOperationElement<TInsert2, TDelete2> => {
    return {
        ...source,
        secondEdit: mapEditElement({
            source: source.secondEdit,
            mapInsert,
            mapDelete,
        }),
    };
};

export const invertTextOperationElement = <T1, T2>(
    source: TextOperationElement<T1, T2>
): TextOperationElement<T2, T1> => {
    return {
        ...source,
        secondEdit: invertEditElement(source.secondEdit),
    };
};
