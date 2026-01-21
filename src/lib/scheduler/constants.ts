export const DAY_MAP: Record<string, string> = {
  PAZARTESI: "Monday",
  "PAZARTESİ": "Monday",
  pazartesi: "Monday",
  SALI: "Tuesday",
  sali: "Tuesday",
  "ÇARŞAMBA": "Wednesday",
  "ÇARSAMBA": "Wednesday",
  "çarşamba": "Wednesday",
  "çarsamba": "Wednesday",
  "PERŞEMBE": "Thursday",
  "PERSEMBE": "Thursday",
  "perşembe": "Thursday",
  persembe: "Thursday",
  CUMA: "Friday",
  cuma: "Friday",
  CUMARTESI: "Saturday",
  "CUMARTESİ": "Saturday",
  cumartesi: "Saturday",
  PAZAR: "Sunday",
  pazar: "Sunday"
};

export const TERM_SUFFIX: string[] = ["spring.json", "fall.json", "summer.json"];

export const TIME_SLOTS: string[] = [
  "08:40-09:30",
  "09:40-10:30",
  "10:40-11:30",
  "11:40-12:30",
  "12:40-13:30",
  "13:40-14:30",
  "14:40-15:30",
  "15:40-16:30",
  "16:40-17:30",
  "17:40-18:30",
  "18:40-19:30",
  "19:40-20:30",
  "20:40-21:30",
  "21:40-22:30"
];

export const DAYS_OF_WEEK: string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

// Scheduling engine limits and batch sizes.
export const MAX_CONFLICT_PAIRS = 32;
export const CONFLICT_SAMPLE_LIMIT = 3;
export const PROGRESS_BATCH_SIZE = 250;
