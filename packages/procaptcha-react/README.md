# React Prosopo Procaptcha Component Library

React components for integrating the Prosopo [procaptcha](https://github.com/prosopo/procaptcha) into a React app.

Prosopo is a distributed human verification service that can be used to stop bots from interacting with smart contracts. Sign up to be a network [alpha tester](https://5b06hrhtlmh.typeform.com/to/vNpyOUfg).

## Installation

You can install this library with:

```bash
npm install @prosopo/procaptcha-react --save
```

## Basic Usage

See the [client example](https://github.com/prosopo/client-example) for a minimal example of these components being used in a frontend app.

```typescript
<Box className={"App"}>

  
      <CaptchaContextManager.Provider value={manager}>
        {showCaptchas &&
          <CaptchaComponent {...{ clientInterface }} />}
      </CaptchaContextManager.Provider>

      {!showCaptchas &&
        <Button onClick={showCaptchaClick} className={"i-am-human-button"}>
          <Typography className={"i-am-human-button-label"}>
            I am human
          </Typography>
        </Button>}

    </Box>
```

### Callbacks
`CaptchaEventCallbacks` are passed to the captcha component at creation.

```typescript
const clientInterface = useCaptcha({ config }, { onAccountChange, onChange, onSubmit, onSolved, onCancel });
```

The captcha event callbacks are defined as follows:

```typescript
export interface CaptchaEventCallbacks extends ICaptchaClientEvents, ICaptchaStateClientEvents { }

export interface ICaptchaClientEvents {
  onLoad?: (extension: IExtensionInterface, contractAddress: string) => void;
  onAccountChange?: (account?: TExtensionAccount) => void;
}

export interface ICaptchaStateClientEvents {
  onLoadCaptcha?: (captchaChallenge: GetCaptchaResponse | Error) => void;
  onSubmit?: (result: TCaptchaSubmitResult | Error, captchaState: ICaptchaState) => void;
  onChange?: (captchaSolution: number[][], index: number) => void;
  onCancel?: () => void;
  onSolved?: (result: TCaptchaSubmitResult, isHuman?: boolean) => void;
}
```

#### onAccountChange

When an account is connected or disconnected.

#### onLoadCaptcha

After a captcha challenge has loaded/failed to load, updates captchaChallenge state and resets captchaIndex.

#### onChange

When the captchaSolution is updated (after clicking an image).

#### onSubmit

Event fired after captcha solution has been submitted. Resets captchaSolution state.

#### onSolved

When captcha is solved. after clearing captchaChallenge.

#### onCancel

When captcha is dismissed. before clearing captchaChallenge.
