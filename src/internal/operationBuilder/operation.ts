import { PositiveInt } from '../positiveInt';
import { EditElement, mapEditElement } from './editElement';
import { mapOperationElement, OperationElement } from './operationElement';

export type Operation<TInsert, TDelete> = {
    headEdit?: EditElement<TInsert, TDelete>;
    body: ReadonlyArray<OperationElement<TInsert, TDelete>>;
    tailRetain?: PositiveInt;
};

export const mapOperation = <TInsert1, TInsert2, TDelete1, TDelete2>({
    source,
    mapInsert,
    mapDelete,
}: {
    source: Operation<TInsert1, TDelete1>;
    mapInsert: (source: TInsert1) => TInsert2;
    mapDelete: (source: TDelete1) => TDelete2;
}): Operation<TInsert2, TDelete2> => {
    return {
        headEdit:
            source.headEdit === undefined
                ? source.headEdit
                : mapEditElement({
                      source: source.headEdit,
                      mapInsert,
                      mapDelete,
                  }),
        body: source.body.map(body => mapOperationElement({ source: body, mapInsert, mapDelete })),
        tailRetain: source.tailRetain,
    };
};
