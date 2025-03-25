<script setup lang="ts">
import {onMounted, onUpdated, useTemplateRef} from "vue";

import {HTMLAttributes} from "vue"
import {type ProcaptchaOptions, procaptchaWrapper} from "@prosopo/procaptcha-wrapper";

type ProcaptchaComponentProperties = ProcaptchaOptions & {
  htmlAttrs?: AllHtmlAttributes,
}

type AllHtmlAttributes = HTMLAttributes & {
  // allow custom data attributes
  [key: string]: any
};

const properties = defineProps<ProcaptchaComponentProperties>();
const wrapper = useTemplateRef("wrapper");

// refuse unregistered properties.
defineOptions({
  inheritAttrs: false
});

onMounted(() => {
  renderProcaptcha();
});
onUpdated(() => {
  renderProcaptcha();
});

function renderProcaptcha(): void {
  const wrapperElement = wrapper.value;

  if (wrapperElement instanceof HTMLElement) {
    procaptchaWrapper.renderProcaptcha(wrapperElement, properties);
  }
}
</script>

<template>
  <div ref="wrapper" v-bind="htmlAttrs"></div>
</template>
