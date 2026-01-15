/**
 * API Configuration for Asset Atlas
 * 
 * To use real market data, you need to set up API keys:
 * 
 * 1. Create a .env file in the project root
 * 2. Add your API keys:
 * 
 *    VITE_EBAY_APP_ID=your_ebay_app_id
 *    VITE_PRICECHARTING_API_KEY=your_pricecharting_key
 * 
 * Getting API Keys:
 * 
 * eBay API (free):
 *   1. Go to https://developer.ebay.com/
 *   2. Sign in or create account
 *   3. Go to "Hi [Name]" > "Application Keys"
 *   4. Create a Production keyset
 *   5. Copy the "App ID (Client ID)"
 * 
 * PriceCharting API (free tier - 500 req/day):
 *   1. Go to https://www.pricecharting.com/api
 *   2. Sign up for API access
 *   3. Copy your API key
 */

export const apiConfig = {
  ebay: {
    appId: import.meta.env.VITE_EBAY_APP_ID || '',
    baseUrl: 'https://api.ebay.com',
    // For browse API we need OAuth - this is the sandbox for testing
    sandboxUrl: 'https://api.sandbox.ebay.com',
  },
  priceCharting: {
    apiKey: import.meta.env.VITE_PRICECHARTING_API_KEY || '',
    baseUrl: 'https://www.pricecharting.com/api',
  },
};

export const isEbayConfigured = () => Boolean(apiConfig.ebay.appId);
export const isPriceChartingConfigured = () => Boolean(apiConfig.priceCharting.apiKey);
export const isAnyApiConfigured = () => isEbayConfigured() || isPriceChartingConfigured();
