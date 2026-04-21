declare module "multiformats/cid" {
  export { CID } from "multiformats/types/src/cid";
}

declare module "shapefile" {
  export function open(shp: string | Buffer, dbf?: string | Buffer, options?: object): Promise<any>;
  export function openDbf(dbf: string | Buffer, options?: object): Promise<any>;
  export function read(shp: string | Buffer, dbf?: string | Buffer, options?: object): Promise<any>;
}
