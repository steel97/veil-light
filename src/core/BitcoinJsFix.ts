export function putVarInt(i: number) { //uint64_t
    const u8a = new Uint8Array(9);
    let nBytes = 0; // int
    let b = i & 0x7F; // byte
    let ptr = 0;
    while ((i = i >> 7) > 0) {
        u8a[ptr++] = b | 0x80;
        //*p++ = b | 0x80;
        b = i & 0x7F;
        nBytes++;
    }
    u8a[ptr++] = b;
    nBytes++;
    const buf = Buffer.alloc(nBytes);
    buf.set(u8a.slice(0, nBytes), 0);
    return buf;
}


/*

export function putVarInt(ix: number) { //uint64_t
    const u8a = new Uint8Array(9);
    const i = new BigUint64Array(1);
    const b = new Uint8Array(1);
    i[0] = BigInt(ix);

    let nBytes = 0; // int
    b[0] = Number(i[0] & 0x7Fn); // byte
    let ptr = 0;
    while ((i[0] = i[0] >> 7n) > 0) {
        u8a[ptr++] = b[0] | 0x80;
        //*p++ = b | 0x80;
        b[0] = Number(i[0] & 0x7Fn);
        nBytes++;
    }
    u8a[ptr++] = b[0];
    nBytes++;
    const buf = Buffer.alloc(nBytes);
    buf.set(u8a.slice(0, nBytes), 0);
    return buf;
};
*/