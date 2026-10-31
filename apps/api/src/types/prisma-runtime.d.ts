declare module '@prisma/client/runtime/library' {
  export class Decimal {
    public constructor(value?: string | number | Decimal);
    public plus(value: Decimal | string | number): Decimal;
    public minus(value: Decimal | string | number): Decimal;
    public times(value: Decimal | string | number): Decimal;
    public mul(value: Decimal | string | number): Decimal;
    public div(value: Decimal | string | number): Decimal;
    public toDecimalPlaces(decimalPlaces?: number): Decimal;
    public gte(value: Decimal | string | number): boolean;
    public lt(value: Decimal | string | number): boolean;
    public toString(): string;
    public static max(...values: Decimal[]): Decimal;
    public static min(...values: Decimal[]): Decimal;
  }
}
