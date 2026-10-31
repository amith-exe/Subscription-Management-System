declare module '@prisma/client/runtime/library' {
  // Prisma 6.19.3 ships the runtime JavaScript file without this declaration
  // in this workspace. Keeping the deny list empty preserves the generated
  // transaction delegates while the runtime still enforces its own API.
  export type ITXClientDenyList = never;

  export class Decimal {
    public constructor(value?: string | number | Decimal);
    public plus(value: Decimal | number | string): Decimal;
    public minus(value: Decimal | number | string): Decimal;
    public times(value: Decimal | number | string): Decimal;
    public mul(value: Decimal | number | string): Decimal;
    public div(value: Decimal | number | string): Decimal;
    public toDecimalPlaces(decimalPlaces?: number): Decimal;
    public gte(value: Decimal | number | string): boolean;
    public gt(value: Decimal | number | string): boolean;
    public lte(value: Decimal | number | string): boolean;
    public lt(value: Decimal | number | string): boolean;
    public toString(): string;
    public static max(...values: Decimal[]): Decimal;
    public static min(...values: Decimal[]): Decimal;
  }
}
