import { insert$, delete$, retain, edit } from '../const';
import { PositiveInt } from '../positiveInt';
import { OperationBuilderFactory } from './operationBuilderFactory';
import { EditElement, mergeEditElement } from './editElement';
import { Operation } from './operation';
import { OperationArrayElement } from './operationArrayElement';
import { OperationElement } from './operationElement';
import { OperationUnit } from './operationUnit';

export class OperationBuilder<TInsert, TDelete> {
    public constructor(
        private factory: OperationBuilderFactory<TInsert, TDelete>,
        source?: Operation<TInsert, TDelete>
    ) {
        if (source == null) {
            return;
        }
        this.headEdit = source.headEdit ?? null;
        this.body = Array.from(source.body);
        this.tailRetain = source.tailRetain ?? 0;
    }

    private headEdit: EditElement<TInsert, TDelete> | null = null;
    private readonly body: OperationElement<TInsert, TDelete>[] = [];
    private tailRetain: PositiveInt | 0 = 0;

    public retain(count: PositiveInt): void {
        if (this.tailRetain === 0) {
            this.tailRetain = count;
            return;
        }
        this.tailRetain = PositiveInt.add(this.tailRetain, count);
    }

    public edit(edit: EditElement<TInsert, TDelete>) {
        if (this.tailRetain !== 0) {
            this.body.push({
                firstRetain: this.tailRetain,
                secondEdit: edit,
            });
            this.tailRetain = 0;
            return;
        }

        if (this.body.length !== 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const last = this.body[this.body.length - 1]!;
            this.body[this.body.length - 1] = {
                ...last,
                secondEdit: mergeEditElement(
                    last.secondEdit,
                    edit,
                    this.factory.concatInsert,
                    this.factory.concatDelete
                ),
            };
            return;
        }

        if (this.headEdit == null) {
            this.headEdit = edit;
            return;
        }
        this.headEdit = mergeEditElement(
            this.headEdit,
            edit,
            this.factory.concatInsert,
            this.factory.concatDelete
        );
    }

    public insert(insert: TInsert): void {
        this.edit({ type: insert$, insert });
    }

    public delete(del: TDelete): void {
        this.edit({ type: delete$, delete: del });
    }

    public onArrayElement(arrayElement: OperationArrayElement<TInsert, TDelete>) {
        switch (arrayElement.type) {
            case retain:
                this.retain(arrayElement.retain);
                return;
            case edit:
                this.edit(arrayElement.edit);
        }
    }

    public onUnit(unit: OperationUnit<TInsert, TDelete>) {
        if (unit.type === retain) {
            this.retain(unit.retain);
            return;
        }
        this.edit(unit);
    }

    public build(): Operation<TInsert, TDelete> {
        return {
            headEdit: this.headEdit ?? undefined,
            body: Array.from(this.body),
            tailRetain: this.tailRetain === 0 ? undefined : this.tailRetain,
        };
    }

    public *toIterable(): IterableIterator<OperationArrayElement<TInsert, TDelete>> {
        const operation = this.build();
        if (operation.headEdit != null) {
            yield { type: edit, edit: operation.headEdit };
        }
        for (const body of operation.body) {
            yield { type: retain, retain: body.firstRetain };
            yield { type: edit, edit: body.secondEdit };
        }
        if (operation.tailRetain != null) {
            yield { type: retain, retain: operation.tailRetain };
        }
    }

    public *toUnits(): IterableIterator<OperationUnit<TInsert, TDelete>> {
        for (const elem of this.toIterable()) {
            if (elem.type === retain) {
                yield { type: retain, retain: elem.retain };
                continue;
            }
            if (elem.edit.delete !== undefined) {
                yield { type: delete$, delete: elem.edit.delete };
            }
            if (elem.edit.insert !== undefined) {
                yield { type: insert$, insert: elem.edit.insert };
            }
        }
    }
}
