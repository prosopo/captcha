# @prosopo/load-balancer

Provider load balancer for the Prosopo CAPTCHA system.

## Provider Selection Config

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
