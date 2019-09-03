export interface IQueryResult {
    rows: Array<any>;
    fields: Array<IFieldInfo>;
    rowCount: number,
    command: string;
};

interface IFieldInfo {
    name: string;
    dataTypeId: string;
};