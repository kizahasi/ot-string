# @kizahasi/ot-string

![GitHub](https://img.shields.io/github/license/kizahasi/ot-string) [![npm version](https://img.shields.io/npm/v/@kizahasi/ot-string.svg?style=flat)](https://www.npmjs.com/package/@kizahasi/ot-string) ![minified size](https://img.shields.io/bundlephobia/min/@kizahasi/ot-string) [![CI](https://github.com/kizahasi/ot-string/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kizahasi/ot-string/actions/workflows/ci.yml) [![publish](https://github.com/kizahasi/ot-string/actions/workflows/publish.yml/badge.svg?branch=release)](https://github.com/kizahasi/ot-string/actions/workflows/publish.yml)

Operational Transfomation library for string.

## Installation

Run `npm install @kizahasi/ot-string` or `yarn add @kizahasi/ot-string`.

To use it in a browser directly, you can use [Skypack](https://www.skypack.dev/view/@kizahasi/ot-string).

## Usage

### Diff two texts

```javascript
import { diff } from '@kizahasi/ot-string';

const prevState = 'January';
const nextState = 'February';

const twoWayOperation = diff({ prevState, nextState });
```

### Apply operations

```javascript
import { diff, toUpoperation, apply, toDownOperation, applyBack } from '@kizahasi/ot-string';

const prevState = 'January';
const nextState = 'February';
const twoWayOperation = diff({ prevState, nextState });

// `toUpOperation` drops some data from twoWayOperation, but its object size is reduced.
const upOperation = toUpOperation(twoWayOperation);
const nextState2 = apply({ prevState, upOperation });
console.log(nextState2.isError, nextState2.value);
// => false February

// `toDownOperation` drops some data from twoWayOperation, but its object size is reduced.
const downOperation = toDownOperation(twoWayOperation);
const prevState2 = applyBack({ prevState, upOperation });
console.log(nextState2.isError, nextState2.value);
// => false January
```

### Operational transformation

```javascript
import { toUpOperation, diff, transformUpOperation, apply } from '@kizahasi/ot-string';

const state1 = 'June 1';
const state2_june2 = 'June 2';
const state2_july1 = 'July 1';

const first = toUpOperation(diff({ prevState: state1, nextState: state2_june2 }));
const second = toUpOperation(diff({ prevState: state1, nextState: state2_july1 }));

const transformed = transformUpOperation({ first, second });
console.log(transformed.isError);
// => false

// state1 + first + secondPrime
const state3a = apply({ prevState: state2_june2, upOperation: transformed.value.secondPrime });
// state1 + second + firstPrime
const state3b = apply({ prevState: state2_july1, upOperation: transformed.value.firstPrime });

console.log(state3a.isError);
// => false
console.log(state3b.isError);
// => false
console.log(state3a.value === 'July 2');
// => true

// state1 + first + secondPrime = state1 + second + firstPrime
console.log(state3a.value === state3b.value);
// => true
```

### Serialization and deserialization

```javascript
import {
    diff,
    toDownOperation,
    toUpOperation,
    serializeUpOperation,
    serializeDownOperation,
    deserializeUpOperation,
    deserializeDownOperation,
    deserializeTwoWayOperation,
} from '@kizahasi/ot-string';

const twoWayOperation = diff({ prevState: 'hour', nextState: 'ours' });
const upOperation = toUpOperation(twoWayOperation);
const downOperation = toDownOperation(twoWayOperation);

// Serialize UpOperation.
const serializedUpOperation = serializeUpOperation(upOperation);
console.log(serializedUpOperation);
// => [ { t: 'd', d: 1 }, { t: 'r', r: 3 }, { t: 'i', i: 's' } ]
// (t = type, r = retain, i = insert, d = delete. Above object indicates "Delete 1 character, then retain 3 characters, finally insert 's'.")

// Serialize DownOperation.
const serializedDownOperation = serializeDownOperation(downOperation);
console.log(serializedDownOperation);
// => [ { t: 'd', d: 'h' }, { t: 'r', r: 3 }, { t: 'i', i: 1 } ]

// Serialize TwoWayOperation.
const serializedTwoWayOperation = serializeTwoWayOperation(downOperation);
console.log(serializedDownOperation);
// => [ { t: 'd', d: 'h' }, { t: 'r', r: 3 }, { t: 'i', i: 's' } ]

// Deserialize.
const deserializedUpOperation = deserializeUpOperation(serializedUpOperation);
const deserializedDownOperation = deserializeDownOperation(serializedDownOperation);
const deserializedTwoWayOperation = deserializeTwoWayOperation(serializedTwoWayOperation);
```

## Issues

-   Some functions are not implemented (e.g. transformDownOperation).

## License

MIT
