# @prosopo/load-balancer

Provider load balancer for the Prosopo CAPTCHA system.

## Overview

The load balancer manages provider selection for the Prosopo CAPTCHA system. It fetches provider configurations from different environments and uses weighted random selection to distribute load across providers.

## Features

- **Environment-based provider lists**: Automatically fetches provider configurations for production, staging, and development environments
- **Weighted selection**: Providers can be assigned weights (1-100) to control traffic distribution
- **Schema validation**: Uses Zod to validate and normalize provider data
- **Deterministic selection**: Uses entropy values for reproducible provider selection
- **Caching**: Provider lists are cached to minimize network requests

## Provider Configuration

Each provider in the system has the following properties:

```typescript
{
  address: string;      // Provider account address
  url: string;          // Provider API endpoint
  datasetId: string;    // Dataset identifier
  weight?: number;      // Optional weight (1-100, defaults to 1)
}
```

### Weight Field

The `weight` field controls how often a provider is selected:

- **Range**: 1-100 (values outside this range are automatically coerced)
- **Default**: 1 (if not specified)
- **Type**: Integer (decimal values are rounded)
- **Effect**: Higher weight = more traffic

#### Examples

```json
{
  "provider1": {
    "address": "...",
    "url": "https://provider1.example.com",
    "datasetId": "...",
    "weight": 1
  },
  "provider2": {
    "address": "...",
    "url": "https://provider2.example.com",
    "datasetId": "...",
    "weight": 3
  }
}
```

In this example:
- Total weight = 4
- Provider 1 receives ~25% of traffic
- Provider 2 receives ~75% of traffic

## Weighted Selection Algorithm

The load balancer uses a cumulative weight algorithm for provider selection:

1. Calculate the total weight of all providers
2. Use the entropy value (modulo total weight) to generate a deterministic selection value
3. Iterate through providers, accumulating weights until the selection value is reached
4. Return the selected provider

This approach ensures:
- **Deterministic**: Same entropy value always selects the same provider
- **Proportional**: Selection probability matches weight ratios
- **Efficient**: O(n) time complexity where n is the number of providers

### Example

With providers `[weight: 1, weight: 3, weight: 1]` (total weight = 5):

```
entropy %5 = 0 → Provider 1
entropy %5 = 1 → Provider 2
entropy %5 = 2 → Provider 2
entropy %5 = 3 → Provider 2
entropy %5 = 4 → Provider 3
```

## Usage

```typescript
import { loadBalancer, getRandomActiveProvider } from '@prosopo/load-balancer';

// Get all providers for an environment
const providers = await loadBalancer('production');

// Get a weighted random provider
const { providerAccount, provider } = await getRandomActiveProvider(
  'production',
  12345 // entropy value for selection
);

console.log(`Selected provider: ${provider.url}`);
```

## Environment Configuration

### Production
Fetches provider list from: `https://provider-list.prosopo.io/`

### Staging
Fetches provider list from: `https://provider-list.prosopo.io/staging.json`

### Development
Uses a hardcoded local provider at `http://localhost:9229`

## Testing

The package includes comprehensive unit tests covering:

- Weighted selection distribution
- Edge cases (single provider, empty list)
- Equal weight handling
- Maximum weight values
- Provider caching
- Error handling

Run tests with:

```bash
npm test
```

## License

Apache-2.0

