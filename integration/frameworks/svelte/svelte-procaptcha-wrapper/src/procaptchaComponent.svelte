<script lang="ts">
    import {tick} from "svelte";
    import {type ProcaptchaOptions, procaptchaWrapper} from "@prosopo/procaptcha-wrapper";

    type ProcaptchaComponentProperties = ProcaptchaOptions & {
        htmlAttrs?: AllHtmlAttributes,
    }

    type AllHtmlAttributes = HTMLAttributes & {
        // allow custom data attributes
        [key: string]: any
    };

    const properties: ProcaptchaComponentProperties = $props();
    let wrapperElement: HTMLDivElement;

    $effect.pre(() => {
        tick().then(() => {
            procaptchaWrapper.renderProcaptcha(wrapperElement, properties);
        });
    });
</script>

<div bind:this={wrapperElement}></div>