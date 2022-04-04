import { PositiveInt } from '../positiveInt';
import { EditElement, mapEditElement } from './editElement';
import { mapTextOperationElement, TextOperationElement } from './textOperationElement';

export type TextOperation<TInsert, TDelete> = {
    headEdit?: EditElement<TInsert, TDelete>;
    body: ReadonlyArray<TextOperationElement<TInsert, TDelete>>;
    tailRetain?: PositiveInt;
};

export const mapTextOperation = <TInsert1, TInsert2, TDelete1, TDelete2>({
    source,
    mapInsert,
    mapDelete,
}: {
    source: TextOperation<TInsert1, TDelete1>;
    mapInsert: (source: TInsert1) => TInsert2;
    mapDelete: (source: TDelete1) => TDelete2;
}): TextOperation<TInsert2, TDelete2> => {
    return {
        headEdit:
            source.headEdit === undefined
                ? source.headEdit
                : mapEditElement({
                      source: source.headEdit,
                      mapInsert,
                      mapDelete,
                  }),
        body: source.body.map(body =>
            mapTextOperationElement({ source: body, mapInsert, mapDelete })
        ),
        tailRetain: source.tailRetain,
    };
};
