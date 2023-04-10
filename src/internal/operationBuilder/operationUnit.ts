import { retain, insert$, delete$ } from '../const';
import { PositiveInt } from '../positiveInt';
import { prevLengthOfEditElement, nextLengthOfEditElement } from './editElement';
import { OperationBuilderFactory } from './operationBuilderFactory';

export type OperationUnit<TInsert, TDelete> =
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

export const prevLengthOfOperationUnitArray = <TInsert, TDelete>(
    source: ReadonlyArray<OperationUnit<TInsert, TDelete>>,
    factory: OperationBuilderFactory<TInsert, TDelete>
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

export const nextLengthOfOperationUnitArray = <TInsert, TDelete>(
    source: ReadonlyArray<OperationUnit<TInsert, TDelete>>,
    factory: OperationBuilderFactory<TInsert, TDelete>
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
