import { PositiveInt } from '@kizahasi/ot-core';

export class NonEmptyString {
    #source: string;

    constructor(source: string) {
        if (source === '') {
            throw new Error('empty string');
        }
        this.#source = source;
    }

    get value(): string {
        return this.#source;
    }

    get length(): PositiveInt {
        return new PositiveInt(this.value.length);
    }

    concat(other: NonEmptyString): NonEmptyString {
        return new NonEmptyString(this.value + other.value);
    }

    static tryCreate(source: string): NonEmptyString | undefined {
        if (source === '') {
            return undefined;
        }
        return new NonEmptyString(source);
    }

    toString() {
        return this.value;
    }
}
