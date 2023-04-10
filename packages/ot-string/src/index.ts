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
export { Insert, Delete, Replace } from './internal/type';
export {
    TwoWayOperation,
    TwoWayOperationUnit,
    toDownOperation,
    toUpOperation,
    toUnit as serializeTwoWayOperation,
    ofUnit as deserizalizeTwoWayOperation,
    diff as diff,
    transform as transformTwoWayOperation,
} from './internal/operation/twoWayOperation';
export {
    UpOperation,
    UpOperationUnit,
    apply,
    applyAndRestore,
    invert as invertUpOperation,
    compose as composeUpOperation,
    toUnit as serializeUpOperation,
    ofUnit as deserializeUpOperation,
    transform as transformUpOperation,
} from './internal/operation/upOperation';
export {
    DownOperation,
    DownOperationUnit,
    applyBack,
    applyBackAndRestore,
    invert as invertDownOperation,
    compose as composeDownOperation,
    toUnit as serializeDownOperation,
    ofUnit as deserializeDownOperation,
} from './internal/operation/downOperation';
export { Operation } from './internal/operationBuilder/operation';
export { OperationArrayElement } from './internal/operationBuilder/operationArrayElement';
export { OperationBuilder } from './internal/operationBuilder/operationBuilder';
export { OperationBuilderFactory } from './internal/operationBuilder/operationBuilderFactory';
export { OperationUnit } from './internal/operationBuilder/operationUnit';
