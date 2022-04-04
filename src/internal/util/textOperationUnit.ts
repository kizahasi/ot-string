import { retain, insert$, delete$ } from '../const';
import { PositiveInt } from '../positiveInt';
import { prevLengthOfEditElement, nextLengthOfEditElement } from './editElement';
import { Factory } from './factory';

export type TextOperationUnit<TInsert, TDelete> =
    | {
          type: typeof retain;
          retain: PositiveInt;
      }
    | {
          type: typeof insert$;
          insert: TInsert;
      }
    | {
          type: typeof delete$;
          delete: TDelete;
      };

export const prevLengthOfTextOperationUnitArray = <TInsert, TDelete>(
    source: ReadonlyArray<TextOperationUnit<TInsert, TDelete>>,
    factory: Factory<TInsert, TDelete>
) => {
    return source.reduce((seed, elem) => {
        switch (elem.type) {
            case retain:
                return seed + elem.retain.value;
            default:
                return seed + prevLengthOfEditElement(elem, factory);
        }
    }, 0);
};

export const nextLengthOfTextOperationUnitArray = <TInsert, TDelete>(
    source: ReadonlyArray<TextOperationUnit<TInsert, TDelete>>,
    factory: Factory<TInsert, TDelete>
) => {
    return source.reduce((seed, elem) => {
        switch (elem.type) {
            case retain:
                return seed + elem.retain.value;
            default:
                return seed + nextLengthOfEditElement(elem, factory);
        }
    }, 0);
};
