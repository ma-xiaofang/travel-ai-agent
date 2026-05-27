export type WeatherSnapshot = {
  temp: number;
  feels: number;
  weather: string;
  humidity: number;
  wind: string;
};

export type AttractionItem = {
  name: string;
  type: string;
  duration: string;
  ticket: string;
  tips: string;
};

export type DailyCostBreakdown = {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
};

export type VisaInfo = {
  type: string;
  status: string;
  validity: string;
  processing: string;
  fee: string;
  materials: string[];
  tips: string;
};
