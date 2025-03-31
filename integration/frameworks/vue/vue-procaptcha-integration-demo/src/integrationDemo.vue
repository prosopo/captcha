<template>
 <ProcaptchaComponent :siteKey="siteKey" :htmlAttributes="{class:'my-app__procaptcha'}"/>
</template>

<script setup lang="ts">
import {ProcaptchaComponent} from "@prosopo/vue-procaptcha-wrapper";

// @ts-expect-error Env variables will be read by Vite
const siteKey = import.meta.env.VITE_PROCAPTCHA_SITE_KEY;
</script>
