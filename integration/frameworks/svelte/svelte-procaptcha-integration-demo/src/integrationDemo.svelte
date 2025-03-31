<script lang="ts">

import {ProcaptchaComponent} from "@prosopo/svelte-procaptcha-wrapper";

// @ts-expect-error Env variables will be read by Vite
const siteKey = import.meta.env.VITE_PROCAPTCHA_SITE_KEY;
</script>

<div>
    <ProcaptchaComponent siteKey="{siteKey}" htmlAttributes={{class: "my-app__procaptcha"}} />
</div>