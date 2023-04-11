import { Operation } from './operationBuilder/operation';

export const secondTooShort = 'secondTooShort';
export const secondTooLong = 'secondTooLong';
export const deleteValueNotMatch = 'deleteValueNotMatch';
export const stateTooShort = 'stateTooShort';
export const stateTooLong = 'stateTooLong';

export type ApplyError<TInsert, TDelete> =
    | {
          type: typeof stateTooShort;
      }
    | {
          type: typeof stateTooLong;
      }
    | {
          type: typeof deleteValueNotMatch;
          startCharIndex: number;
          expected: TDelete;
          actual: TInsert;
      };

export type ComposeAndTransformErrorBase = {
    type: typeof secondTooShort | typeof secondTooLong;
};

export type ComposeAndTransformError<TInsert, TDelete> = ComposeAndTransformErrorBase & {
    first: Operation<TInsert, TDelete>;
    second: Operation<TInsert, TDelete>;
};
