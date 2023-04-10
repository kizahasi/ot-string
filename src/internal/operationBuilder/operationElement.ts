import { PositiveInt } from '../positiveInt';
import { EditElement, mapEditElement, invertEditElement } from './editElement';

export type OperationElement<TInsert, TDelete> = {
    firstRetain: PositiveInt;
    secondEdit: EditElement<TInsert, TDelete>;
};

export const mapOperationElement = <TInsert1, TInsert2, TDelete1, TDelete2>({
    source,
    mapInsert,
    mapDelete,
}: {
    source: OperationElement<TInsert1, TDelete1>;
    mapInsert: (source: TInsert1) => TInsert2;
    mapDelete: (source: TDelete1) => TDelete2;
}): OperationElement<TInsert2, TDelete2> => {
    return {
        ...source,
        secondEdit: mapEditElement({
            source: source.secondEdit,
            mapInsert,
            mapDelete,
        }),
    };
};

export const invertOperationElement = <T1, T2>(
    source: OperationElement<T1, T2>
): OperationElement<T2, T1> => {
    return {
        ...source,
        secondEdit: invertEditElement(source.secondEdit),
    };
};
