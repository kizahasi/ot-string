export { PositiveInt } from './internal/positiveInt';
export { NonEmptyString } from './internal/nonEmptyString';
export { i, d, r, delete$, insert$ } from './internal/const';
export {
    deleteStringNotMatch,
    secondTooLong,
    stateTooShort,
    ApplyError,
    secondTooShort,
    stateTooLong,
    ComposeAndTransformError,
} from './internal/error';
export {
    Operation as TwoWayOperation,
    OperationUnit as TwoWayOperationUnit,
    toDownOperation,
    toUpOperation,
    toUnit as toTwoWayOperationUnit,
    ofUnit as ofTwoWayOperationUnit,
    diff as diff,
    transform as transformTwoWayOperation,
} from './internal/operation/twoWayOperation';
export {
    Operation as UpOperation,
    OperationUnit as UpOperationUnit,
    apply,
    applyAndRestore,
    invert as invertUpOperation,
    compose as composeUpOperation,
    toUnit as toUpOperationUnit,
    ofUnit as ofUpOperationUnit,
    transform as transformUpOperation,
} from './internal/operation/upOperation';
export {
    Operation as DownOperation,
    OperationUnit as DownOperationUnit,
    applyBack,
    applyBackAndRestore,
    invert as invertDownOperation,
    compose as composeDownOperation,
    toUnit as toDownOperationUnit,
    ofUnit as ofDownOperationUnit,
} from './internal/operation/downOperation';
