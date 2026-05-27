export { buildWeatherMock, MOCK_WEATHER } from './weather.mock.js';
export { buildBudgetMock, DAILY_COSTS, FLIGHT_EST, LEVEL_MAP } from './budget.mock.js';
export { buildVisaMock, VISA_DB } from './visa.mock.js';
export { buildCurrencyMock, MOCK_RATES, SPENDING_TIPS } from './currency.mock.js';
export {
  buildAttractionsMock,
  ATTRACTIONS_DB,
} from './attractions.mock.js';
export {
  buildTranslatorMock,
  resolveLanguage,
  PHRASES,
  LANG_MAP,
} from './translator.mock.js';
export { buildPackingMock } from './packing.mock.js';
export { buildItineraryMock } from './itinerary.mock.js';

export type {
  WeatherSnapshot,
  AttractionItem,
  DailyCostBreakdown,
  VisaInfo,
} from './types.js';
