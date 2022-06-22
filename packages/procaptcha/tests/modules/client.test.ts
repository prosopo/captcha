// import { LocalStorageMock } from "../mocks/browser";
import { ProsopoCaptchaConfig } from "../../src/types/api";

import { captchaContextReducer, captchaStateReducer, captchaStatusReducer } from "../../src/modules/client";
import { ICaptchaContextState, ICaptchaState } from "../../src/types/client";

import chai from "chai";

const expect = chai.expect;

describe("CLIENT UNIT TESTS", () => {

    // var localStorage: LocalStorageMock;

    const testConfig: ProsopoCaptchaConfig = { 
      "providerApi.baseURL": "http://localhost:3000",
      "providerApi.prefix": "/v1/prosopo",
      "dappAccount": "",
    }

    before(async () => {
        // localStorage = new LocalStorageMock();
    });

    it("client context reducer", async () => {

        const testState: ICaptchaContextState = {
            config: testConfig,
            contractAddress: "test",
        }

        testConfig.dappAccount = "dapp";
        const contextReducer = captchaContextReducer(testState, { config: testConfig });

        expect(contextReducer.config.dappAccount).to.equal(testConfig.dappAccount);

    });

    it("client state reducer", async () => {

        const testState: ICaptchaState = {
            captchaIndex: 0,
            captchaSolution: [[0, 1, 2, 3]],
        }

        const captchaSolution = testState.captchaSolution;
        captchaSolution.push([4, 5]);

        const stateReducer = captchaStateReducer(testState, { captchaSolution });

        expect(stateReducer.captchaSolution.length).to.equal(2);
        expect(stateReducer.captchaSolution[1]).to.include.members([4, 5]);

    });

});