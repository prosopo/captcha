export function isBot(): Promise<{
    fingerprint: {
        resistance:
            | {
                  privacy: undefined
                  security: undefined
                  mode: undefined
                  extension: undefined
                  engine: any
              }
            | undefined
        headlessFeaturesFingerprint:
            | {
                  likeHeadlessRating: number
                  headlessRating: number
                  stealthRating: number
                  systemFonts: string
                  platformEstimate: any[]
                  chromium: boolean
                  likeHeadless: {
                      noChrome: boolean
                      hasPermissionsBug: boolean
                      noPlugins: boolean
                      noMimeTypes: boolean
                      notificationIsDenied: boolean
                      hasKnownBgColor: boolean
                      prefersLightColor: any
                      uaDataIsBlank: boolean
                      pdfIsDisabled: boolean
                      noTaskbar: boolean
                      hasVvpScreenRes: boolean
                      hasSwiftShader: any
                      noWebShare: any
                      noContentIndex: boolean
                      noContactsManager: boolean
                      noDownlinkMax: boolean
                  }
                  headless: {
                      webDriverIsOn: any
                      hasHeadlessUA: any
                      hasHeadlessWorkerUA: any
                  }
                  stealth: {
                      hasIframeProxy: boolean
                      hasHighChromeIndex: any
                      hasBadChromeRuntime: boolean
                      hasToStringProxy: boolean
                      hasBadWebGL: any
                  }
              }
            | undefined
    }
    isBotBotD: any
    botScore: any
    isBot: boolean
    botType: any
}>
//# sourceMappingURL=index.d.ts.map
