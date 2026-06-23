---
"@prosopo/provider": patch
---

Forward synchronous validation throws in captcha route handlers to Express's error handler. `validateSiteKey`/`validateAddr` throw `ProsopoApiError` synchronously inside the async captcha handlers, but the route wiring invoked the handler without awaiting or attaching a `.catch`, so Express 4 never observed the rejected promise and the request hung instead of returning the intended 4xx response. Each handler is now wrapped in an `asyncHandler` adapter that forwards any rejection to `next(err)`.