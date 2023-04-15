import { Result } from '@kizahasi/result';

const validate = (source: number) => {
    if (!Number.isInteger(source)) {
        return Result.error('not integer');
    }
    if (source < 1) {
        return Result.error('less than 1');
    }
    return Result.ok(source);
};

export class PositiveInt {
    #source: number;

    constructor(source: number) {
        const validateResult = validate(source);
        if (validateResult.isError) {
            throw new Error(validateResult.error);
        }
        this.#source = source;
    }

    get value(): number {
        return this.#source;
    }

    static get one(): PositiveInt {
        return new PositiveInt(1);
    }

    get successor(): PositiveInt {
        return new PositiveInt(this.value + 1);
    }

    static add(x: PositiveInt, y: PositiveInt): PositiveInt {
        return new PositiveInt(x.value + y.value);
    }

    static tryCreate(source: number): PositiveInt | undefined {
        if (validate(source).isError) {
            return undefined;
        }

        return new PositiveInt(source);
    }
}
