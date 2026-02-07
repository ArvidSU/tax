export type SymbolPosition = "prefix" | "suffix";

export const formatPlainAmount = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2).replace(/\.00$/, "");
};

export const formatAmountWithSymbol = (
  value: number,
  symbol: string,
  symbolPosition: SymbolPosition
) => {
  const amount = formatPlainAmount(value);
  return symbolPosition === "suffix" ? `${amount}${symbol}` : `${symbol}${amount}`;
};
