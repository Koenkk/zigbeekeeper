/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {Struct} from "../struct";

/**
 * Address manager entry flags present in `user` field.
 * 
 * *Definition from Z-Stack 3.0.2 `ADdrMgr.h`*
 */
export enum AddressManagerUser {
    /* ADDRMGR_USER_DEFAULT */
    Default = 0x00,

    /* ADDRMGR_USER_ASSOC */
    Assoc = 0x01,

    /* ADDRMGR_USER_SECURITY */
    Security = 0x02,

    /* ADDRMGR_USER_BINDING */
    Binding = 0x04,

    /* ADDRMGR_USER_PRIVATE1 */
    Private1 = 0x08
}

const emptyAddress1 = Buffer.alloc(8, 0x00);
const emptyAddress2 = Buffer.alloc(8, 0xff);

/**
 * Creates an address manager entry for Z-Stack 1.2 and 3.0.
 * 
 * *Definition from Z-Stack 3.0.2 `AddrMgr.h`*
 * *The `uint16` index field is not physically present.*
 * 
 * @param data Data to initialize structure with.
 */
export const addressManagerEntry = (data?: Buffer) => {
    return Struct.new()
        .member("uint8", "user")
        .member("uint16", "nwkAddr")
        .member("uint8array-reversed", "extAddr", 8)
        .method("isSet", Boolean.prototype, e => e.user !== 0x00 && !e.extAddr.equals(emptyAddress1) && !e.extAddr.equals(emptyAddress2))
        .default(Buffer.from("00ffffffffffffffffffff", "hex"))
        .padding(0xff)
        .build(data);
};

/**
 * Creates an address manager entry for Z-Stack 3.x.0 and newer.
 * Z-Stack 3.x.0 and newer uses `0xff` byte instead of `0x00` as user attribute for empty fields.
 * 
 * @param data Data to initialize structure with.
 */
export const addressManagerEntry3x = (data?: Buffer) => {
    return Struct.new()
        .member("uint8", "user")
        .member("uint16", "nwkAddr")
        .member("uint8array-reversed", "extAddr", 8)
        .method("isSet", Boolean.prototype, e => e.user !== 0xff && !e.extAddr.equals(emptyAddress1) && !e.extAddr.equals(emptyAddress2))
        .default(Buffer.from("ffffffffffffffffffffff", "hex"))
        .padding(0xff)
        .build(data);
};
