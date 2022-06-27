# React Prosopo Procaptcha Component Library

React components for integrating the Prosopo [procaptcha](https://github.com/prosopo-io/procaptcha) into a React app.

Prosopo is a distributed human verification service that can be used to stop bots from interacting with smart contracts. Sign up to be a network [alpha tester](https://5b06hrhtlmh.typeform.com/to/vNpyOUfg).

## Installation

You can install this library with:

```bash
npm install @prosopo/procaptcha-react --save
```

## Basic Usage

See the [client example](https://github.com/prosopo-io/client-example) for a minimal example of these components being used in a frontend app.

```typescript
<Box className={"App"}>

  
      <CaptchaContextManager.Provider value={manager}>
        {showCaptchas &&
          <CaptchaComponent {...{ clientInterface }} />}
      </CaptchaContextManager.Provider>

      {!showCaptchas &&
        <Button onClick={showCaptchaClick} className={"iAmHumanButton"}>
          <Typography className={"iAmHumanButtonLabel"}>
            I am human
          </Typography>
        </Button>}

    </Box>
```
