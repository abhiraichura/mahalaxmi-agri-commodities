export interface MandiRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

export interface OGDResponse {
  records: MandiRecord[];
  total: number;
  count: number;
  limit: string;
  offset: string;
}
