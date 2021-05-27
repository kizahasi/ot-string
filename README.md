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
// (t = type, r = retain, i = insert, d = delete)
const upOperationAsUnitArray = TextUpOperation.toUnit(upOperation);
/* upOperationAsUnitArray =
[
    { t: 'd', d: 1 },
    { t: 'i', i: 'Vi' },
    { t: 'r', r: 1 },
    { t: 'd', d: 1 },
    { t: 'i', i: 'l' },
    { t: 'r', r: 1 },
    { t: 'i', i: 't' },
    { t: 'r', r: 6 },
    { t: 'd', d: 1 },
    { t: 'i', i: 'blu' },
    { t: 'r', r: 1 },
    { t: 'd', d: 1 }
]
*/
const downOperationAsUnitArray = TextDownOperation.toUnit(downOperation);
/* downOperationAsUnitArray =
[
    { t: 'd', d: 'R' },
    { t: 'i', i: 2 },
    { t: 'r', r: 1 },
    { t: 'd', d: 's' },
    { t: 'i', i: 1 },
    { t: 'r', r: 1 },
    { t: 'i', i: 1 },
    { t: 'r', r: 6 },
    { t: 'd', d: 'r' },
    { t: 'i', i: 3 },
    { t: 'r', r: 1 },
    { t: 'd', d: 'd' }
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