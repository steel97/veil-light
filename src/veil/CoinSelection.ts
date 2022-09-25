import { CENT } from "./Chainparams";

//! target minimum change amount
export const MIN_CHANGE = CENT;
//! final minimum change amount after paying for fees
export const MIN_FINAL_CHANGE = MIN_CHANGE / 2n;