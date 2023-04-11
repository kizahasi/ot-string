import { delete$, insert$, replace$ } from './const';

export type Insert<TInsert> = {
    type: typeof insert$;
    insert: TInsert;
    delete?: undefined;
};

export type Delete<TDelete> = {
    type: typeof delete$;
    insert?: undefined;
    delete: TDelete;
};

export type Replace<TInsert, TDelete> = {
    type: typeof replace$;
    insert: TInsert;
    delete: TDelete;
};
