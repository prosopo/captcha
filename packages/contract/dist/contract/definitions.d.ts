export declare const contractDefinitions: {
    GovernanceStatus: {
        _enum: string[];
    };
    CaptchaStatus: {
        _enum: string[];
    };
    DappAccounts: string;
    ProsopoDapp: {
        status: string;
        balance: string;
        owner: string;
        min_difficulty: string;
        client_origin: string;
    };
    ProsopoError: {
        _enum: string[];
    };
    Payee: {
        _enum: string[];
    };
    User: {
        correct_captchas: string;
        incorrect_captchas: string;
    };
    ProviderAccounts: string;
    ProsopoProvider: {
        status: string;
        balance: string;
        fee: string;
        payee: string;
        service_origin: string;
        captcha_dataset_id: string;
    };
    ProsopoRandomProvider: {
        provider_id: string;
        provider: string;
        block_number: string;
    };
    ProviderMap: string;
    ProsopoCaptchaData: {
        provider: string;
        merkle_tree_root: string;
        captcha_type: string;
    };
    ProsopoCaptchaSolutionCommitment: {
        account: string;
        captcha_dataset_id: string;
        status: string;
        contract: string;
        provider: string;
        completed_at: string;
    };
    CaptchaData: {
        provider: string;
        merkle_tree_root: string;
        captcha_type: string;
    };
    ProsopoLastCorrectCaptcha: {
        before_ms: string;
        dapp_id: string;
    };
};
//# sourceMappingURL=definitions.d.ts.map