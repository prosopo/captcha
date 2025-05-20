<script lang="ts">

import {ProcaptchaComponent} from "@prosopo/svelte-procaptcha-wrapper";

// @ts-expect-error Env variables will be read by Vite
const siteKey = import.meta.env.VITE_PROCAPTCHA_SITE_KEY || "";

const handleVerification = (token: string): void => {
    console.log('verified', token);
};

</script>

<div>
    <ProcaptchaComponent siteKey="{siteKey}"
                         captchaType="pow"
                         language="en"
                         callback={handleVerification}
                         htmlAttributes={{class: "my-app__procaptcha"}} />
</div>