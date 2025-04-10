<script lang="ts">
    import {tick, onMount} from "svelte";
    import type {HTMLAttributes} from "svelte/elements";
    import {type ProcaptchaRenderOptions, renderProcaptcha} from "@prosopo/procaptcha-wrapper";

    type ProcaptchaComponentProperties = ProcaptchaRenderOptions & {
        htmlAttributes?: AllHtmlAttributes,
    }

    type AllHtmlAttributes = HTMLAttributes<HTMLElement> & {
        // allow custom data attributes
        [key: string]: any
    };

    const properties: ProcaptchaComponentProperties = $props();
    const htmlWrapperElementAttributes = $derived(properties.htmlAttributes || {});
    let wrapperElement: HTMLDivElement;

    onMount(() => {
        tick().then(() => {
            renderProcaptcha(wrapperElement, properties);
        });
    });

</script>

<div bind:this={wrapperElement} {...htmlWrapperElementAttributes}></div>
