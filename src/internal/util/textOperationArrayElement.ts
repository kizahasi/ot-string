import { edit, retain } from '../const';
import { PositiveInt } from '../positiveInt';
import { EditElement } from './editElement';

export type TextOperationArrayElement<TInsert, TDelete> =
    | {
          type: typeof retain;
          retain: PositiveInt;
      }
    | {
          type: typeof edit;
          edit: EditElement<TInsert, TDelete>;
      };

export const prevLengthOfTextOperationElementArray = <TInsert, TDelete>(
    source: ReadonlyArray<TextOperationArrayElement<TInsert, TDelete>>,
    getDeleteLength: (del: TDelete) => PositiveInt
) => {
    return source.reduce((seed, elem) => {
        switch (elem.type) {
            case retain:
                return seed + elem.retain.value;
            default:
                return (
                    seed +
                    (elem.edit.delete === undefined ? 0 : getDeleteLength(elem.edit.delete).value)
                );
        }
    }, 0);
};
