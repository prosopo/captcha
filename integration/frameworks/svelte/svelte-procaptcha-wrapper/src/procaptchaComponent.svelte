<script lang="ts">
    import {tick, onMount} from "svelte";
    import type {HTMLAttributes} from "svelte/elements";
    import {type ProcaptchaOptions, procaptchaWrapper} from "@prosopo/procaptcha-wrapper";

    type ProcaptchaComponentProperties = ProcaptchaOptions & {
        htmlAttrs?: AllHtmlAttributes,
    }

    type AllHtmlAttributes = HTMLAttributes<HTMLElement> & {
        // allow custom data attributes
        [key: string]: any
    };

    const properties: ProcaptchaComponentProperties = $props();
    const htmlWrapperElementAttributes = $derived(properties.htmlAttrs || {});
    let wrapperElement: HTMLDivElement;

    onMount(() => {
        tick().then(() => {
            procaptchaWrapper.renderProcaptcha(wrapperElement, properties);
        });
    });
</script>

<div bind:this={wrapperElement} {...htmlWrapperElementAttributes}></div>
