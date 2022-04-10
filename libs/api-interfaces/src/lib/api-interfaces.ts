export interface Delta {
  size: number;
  price: number;
}

export interface Orderbook {
  bid: Delta[];
  ask: Delta[];
}
