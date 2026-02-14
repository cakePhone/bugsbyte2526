export interface PricePoint {
  timestamp: number;
  price: number;
}

export type DisplayCurrency = "USD" | "EUR";

export type ChartTimeframe =
  | "1M"
  | "5M"
  | "30MIN"
  | "1H"
  | "24H"
  | "7D"
  | "30D"
  | "1Y";

export interface ChartTimeframeOption {
  key: ChartTimeframe;
  label: string;
  days: number;
  hoursWindow?: number;
}
