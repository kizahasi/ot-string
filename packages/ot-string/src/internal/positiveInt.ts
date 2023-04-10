export class PositiveInt {
    public constructor(private source: number) {
        if (!Number.isInteger(source)) {
            throw new Error('not integer');
        }
        if (source < 1) {
            throw new Error('less than 1');
        }
    }

    public get value(): number {
        return this.source;
    }

    public static get one(): PositiveInt {
        return new PositiveInt(1);
    }

    public get successor(): PositiveInt {
        return new PositiveInt(this.source + 1);
    }

    public static add(x: PositiveInt, y: PositiveInt): PositiveInt {
        return new PositiveInt(x.value + y.value);
    }

    public static tryCreate(source: number): PositiveInt | undefined {
        if (!Number.isInteger(source)) {
            return undefined;
        }
        if (source < 1) {
            return undefined;
        }
        return new PositiveInt(source);
    }
}
