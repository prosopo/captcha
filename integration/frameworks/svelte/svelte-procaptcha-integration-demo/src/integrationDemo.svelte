<script lang="ts">

import {ProcaptchaComponent} from "@prosopo/svelte-procaptcha-wrapper";

// @ts-expect-error Env variables will be read by Vite
const siteKey = import.meta.env.VITE_PROCAPTCHA_SITE_KEY;
</script>

<div>
    test
    <!--fixme <ProcaptchaComponent siteKey="{siteKey}"/>-->
</div>