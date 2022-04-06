import { insert$, delete$, retain, edit } from '../const';
import { PositiveInt } from '../positiveInt';
import { EditElement, insertToEditElement, deleteToEditElement } from './editElement';
import { Factory } from './factory';
import { TextOperation } from './textOperation';
import { TextOperationArrayElement } from './textOperationArrayElement';
import { TextOperationElement } from './textOperationElement';
import { TextOperationUnit } from './textOperationUnit';

export class TextOperationBuilder<TInsert, TDelete> {
    public constructor(
        private factory: Factory<TInsert, TDelete>,
        source?: TextOperation<TInsert, TDelete>
    ) {
        if (source == null) {
            return;
        }
        this.headEdit = source.headEdit ?? null;
        this.body = Array.from(source.body);
        this.tailRetain = source.tailRetain ?? 0;
    }

    private headEdit: EditElement<TInsert, TDelete> | null = null;
    private readonly body: TextOperationElement<TInsert, TDelete>[] = [];
    private tailRetain: PositiveInt | 0 = 0;

    public retain(count: PositiveInt): void {
        if (this.tailRetain === 0) {
            this.tailRetain = count;
            return;
        }
        this.tailRetain = PositiveInt.add(this.tailRetain, count);
    }

    public insert(insert: TInsert): void {
        if (this.tailRetain !== 0) {
            this.body.push({
                firstRetain: this.tailRetain,
                secondEdit: {
                    type: insert$,
                    insert,
                },
            });
            this.tailRetain = 0;
            return;
        }
        if (this.body.length !== 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const last = this.body[this.body.length - 1]!;
            this.body[this.body.length - 1] = {
                ...last,
                secondEdit: insertToEditElement(last.secondEdit, insert, this.factory.concatInsert),
            };
            return;
        }
        if (this.headEdit == null) {
            this.headEdit = {
                type: insert$,
                insert,
                delete: undefined,
            };
            return;
        }
        this.headEdit = insertToEditElement(this.headEdit, insert, this.factory.concatInsert);
    }

    public delete(del: TDelete): void {
        if (this.tailRetain !== 0) {
            this.body.push({
                firstRetain: this.tailRetain,
                secondEdit: {
                    type: delete$,
                    delete: del,
                },
            });
            this.tailRetain = 0;
            return;
        }
        if (this.body.length !== 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const last = this.body[this.body.length - 1]!;
            this.body[this.body.length - 1] = {
                ...last,
                secondEdit: deleteToEditElement(last.secondEdit, del, this.factory.concatDelete),
            };
            return;
        }
        if (this.headEdit == null) {
            this.headEdit = {
                type: delete$,
                insert: undefined,
                delete: del,
            };
            return;
        }
        this.headEdit = deleteToEditElement(this.headEdit, del, this.factory.concatDelete);
    }

    public edit(edit: EditElement<TInsert, TDelete>) {
        if (edit.delete !== undefined) {
            this.delete(edit.delete);
        }
        if (edit.insert !== undefined) {
            this.insert(edit.insert);
        }
    }

    public onArrayElement(arrayElement: TextOperationArrayElement<TInsert, TDelete>) {
        switch (arrayElement.type) {
            case retain:
                this.retain(arrayElement.retain);
                return;
            case edit:
                this.edit(arrayElement.edit);
        }
    }

    public onUnit(unit: TextOperationUnit<TInsert, TDelete>) {
        if (unit.type === retain) {
            this.retain(unit.retain);
            return;
        }
        this.edit(unit);
    }

    public build(): TextOperation<TInsert, TDelete> {
        return {
            headEdit: this.headEdit ?? undefined,
            body: Array.from(this.body),
            tailRetain: this.tailRetain === 0 ? undefined : this.tailRetain,
        };
    }

    public *toIterable(): IterableIterator<TextOperationArrayElement<TInsert, TDelete>> {
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

    public *toUnits(): IterableIterator<TextOperationUnit<TInsert, TDelete>> {
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
