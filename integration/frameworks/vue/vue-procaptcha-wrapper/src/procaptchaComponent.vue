<script setup lang="ts">
import {onMounted, onUpdated, ref} from "vue";

import {HTMLAttributes} from "vue"
import {type ProcaptchaRenderOptions, renderProcaptcha} from "@prosopo/procaptcha-wrapper";

type ProcaptchaComponentProperties = ProcaptchaRenderOptions & {
  htmlAttributes?: AllHtmlAttributes,
}

type AllHtmlAttributes = HTMLAttributes & {
  // allow custom data attributes
  [key: string]: any
};

const properties = defineProps<ProcaptchaComponentProperties>();
const wrapper = ref<HTMLElement | null>(null);

// refuse unregistered properties.
defineOptions({
  inheritAttrs: false
});

onMounted(() => {
  render();
});
onUpdated(() => {
  render();
});

function render(): void {
  const wrapperElement = wrapper.value;

  if (wrapperElement instanceof HTMLElement) {
    renderProcaptcha(wrapperElement, properties);
  }
}
</script>

<template>
  <div ref="wrapper" v-bind="htmlAttributes"></div>
</template>
