export interface SseData<T> {
  timestamp: Date;
  response: {
    type: string;
    data: T;
  };
}
