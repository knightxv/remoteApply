export declare type Options = {
    [key in string]: string | number;
}

export declare type GetDataType = {
    key: string;
    opts?: Options;
}

export declare type SetDataType = {
    key: string;
    value: Uint8Array;
    opts?: Options;
}

export declare type DataType = GetDataType | SetDataType;

export declare function encode(data: DataType): Uint8Array;
export declare function decode(u8a: Uint8Array): DataType;

