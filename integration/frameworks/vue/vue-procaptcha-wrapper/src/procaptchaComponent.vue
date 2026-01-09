<script setup lang="ts">
import {nextTick, onBeforeUnmount, onMounted, onUpdated, ref} from "vue";

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
let abortController: AbortController | null = null;

// refuse unregistered properties.
defineOptions({
  inheritAttrs: false
});

onMounted(async () => {
  await render();
});

onUpdated(async () => {
  await render();
});

onBeforeUnmount(() => {
  // Cancel any ongoing render operation
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
});

async function render(): Promise<void> {
  // Cancel any previous render operation
  if (abortController) {
    abortController.abort();
  }

  // Create new abort controller for this render operation
  abortController = new AbortController();

  // Wait for next DOM update to ensure element is ready
  await nextTick();

  const wrapperElement = wrapper.value;

  if (wrapperElement instanceof HTMLElement && !abortController.signal.aborted) {
    try {
      await renderProcaptcha(wrapperElement, properties);
    } catch (error) {
      // Only log if not aborted (aborted errors are expected during rapid updates)
      if (!abortController.signal.aborted) {
        console.error('Procaptcha render error:', error);
      }
    }
  }
}
</script>

<template>
  <div ref="wrapper" v-bind="htmlAttributes"></div>
</template>
