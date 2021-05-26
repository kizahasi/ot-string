# @kizahasi/ot-string

Operational Transfomation library for string.

## Example

```typescript
import { TextTwoWayOperation, TextUpOperation, TextDownOperation } from '@kizahasi/ot-string';

// Gets diff of two string (diff-match-patch is used)
const twoWayOperation: TextTwoWayOperation.Operation = TextTwoWayOperation.diff(
    {
        first: 'Roses are red',
        second: 'Violets are blue',
    }
);

const upOperation: TextUpOperation.Operation = TextTwoWayOperation.toUpOperation(
    twoWayOperation
);
const second = TextUpOperation.apply({
    prevState: 'Roses are red',
    action: upOperation,
});
/* second = 
{ isError: false, value: 'Violets are blue' }
*/

const downOperation: TextDownOperation.Operation = TextTwoWayOperation.toDownOperation(
    twoWayOperation
);
const first = TextDownOperation.applyBack({
    nextState: 'Violets are blue',
    action: downOperation,
});
/* first =
{ isError: false, value: 'Roses are red' }
*/

// If you want to serialize a Text(Up|Down)Operation.Operation object, Text(Up|Down)Operation.toUpUnit helps you.
const upOperationAsUnitArray = TextUpOperation.toUnit(upOperation);
/* upOperationAsUnitArray =
[
    { type: 'delete', delete: 1 },
    { type: 'insert', insert: 'Vi' },
    { type: 'retain', retain: 1 },
    { type: 'delete', delete: 1 },
    { type: 'insert', insert: 'l' },
    { type: 'retain', retain: 1 },
    { type: 'insert', insert: 't' },
    { type: 'retain', retain: 6 },
    { type: 'delete', delete: 1 },
    { type: 'insert', insert: 'blu' },
    { type: 'retain', retain: 1 },
    { type: 'delete', delete: 1 }
]
*/
const downOperationAsUnitArray = TextDownOperation.toUnit(downOperation);
/* downOperationAsUnitArray =
[
    { type: 'delete', delete: 'R' },
    { type: 'insert', insert: 2 },
    { type: 'retain', retain: 1 },
    { type: 'delete', delete: 's' },
    { type: 'insert', insert: 1 },
    { type: 'retain', retain: 1 },
    { type: 'insert', insert: 1 },
    { type: 'retain', retain: 6 },
    { type: 'delete', delete: 'r' },
    { type: 'insert', insert: 3 },
    { type: 'retain', retain: 1 },
    { type: 'delete', delete: 'd' }
]
*/

// To convert back to Text(Up|Down)Operation.Operation, use ofUnit.
const upOperation2 = TextUpOperation.ofUnit(upOperationAsUnitArray);
// upOperation2 equals to upOperation
const downOperation2 = TextDownOperation.ofUnit(downOperationAsUnitArray);
// downOperation2 equals to downOperation
```

## Issues

- Because this library uses Typescipt namespace, tree-shaking may not work well to reduce the code size.
- Some functions are not implemented (e.g. TextUpOperation.diff).