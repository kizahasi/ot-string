import { PositiveInt } from './positiveInt';

export class NonEmptyString {
    public constructor(private source: string) {
        if (source === '') {
            throw new Error('empty string');
        }
    }

    public get value(): string {
        return this.source;
    }

    public get length(): PositiveInt {
        return new PositiveInt(this.source.length);
    }

    public concat(other: NonEmptyString): NonEmptyString {
        return new NonEmptyString(this.value + other.value);
    }

    public static tryCreate(source: string): NonEmptyString | undefined {
        if (source === '') {
            return undefined;
        }
        return new NonEmptyString(source);
    }
}
