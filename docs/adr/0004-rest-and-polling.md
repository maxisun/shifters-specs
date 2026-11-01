# REST API with polling for dashboard updates

The React frontend and NestJS backend communicate through a versioned REST API specified by OpenAPI. Active operational views poll at intervals no greater than five seconds rather than introducing WebSockets for the MVP, satisfying the agreed update bound with less architectural complexity; atomic backend writes remain authoritative.
