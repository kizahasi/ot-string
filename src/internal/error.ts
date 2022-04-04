import { NonEmptyString } from './nonEmptyString';
import { TextOperation } from './util/textOperation';

export const deleteStringNotMatch = 'deleteStringNotMatch';
export const stateTooShort = 'stateTooShort';
export const stateTooLong = 'stateTooLong';
export const secondTooShort = 'secondTooShort';
export const secondTooLong = 'secondTooLong';

export type ApplyError<TDelete> =
    | {
          type: typeof stateTooShort;
      }
    | {
          type: typeof stateTooLong;
      }
    | {
          type: typeof deleteStringNotMatch;
          startCharIndex: number;
          expected: TDelete;
          actual: NonEmptyString;
      };

export type ComposeAndTransformErrorBase = {
    type: typeof secondTooShort | typeof secondTooLong;
};

export type ComposeAndTransformError<TInsert, TDelete> = ComposeAndTransformErrorBase & {
    first: TextOperation<TInsert, TDelete>;
    second: TextOperation<TInsert, TDelete>;
};
