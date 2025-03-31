# Frameworks cheat sheet

## Overview

<table data-full-width="true"><thead><tr><th>Framework</th><th>Demo app bundle size</th><th>Pros</th><th>Cons</th><th>Conclusions</th></tr></thead><tbody><tr><td>React (v19)</td><td>740 KB</td><td><ol><li>Oldest</li><li>Most widely-adopted</li><li>Very rich ecosystem</li><li>Extensive Docs</li><li>Plenty of community guides and tutorials</li></ol></td><td><ol><li>Big overhead in the bundle size</li><li>Big overhead in runtime</li></ol></td><td><ol><li>Beginner friendly</li><li>Easy to find devs</li><li>Too heavy for tiny apps</li><li>Too heavy for performance-dependent apps </li></ol></td></tr><tr><td>Vue (v3)</td><td>140 KB</td><td><ol><li>Widely-adopted</li><li>Extensive Docs </li><li>Rich ecosystem </li><li>Best performance among Virtual DOM-based solutions</li></ol></td><td><ol><li>Noticeable overhead in the bundle size</li></ol></td><td><ol><li>Beginner friendly</li><li>Easy to find devs</li><li>Middle-ground among competitors: combines wide adoption with strong performance </li></ol></td></tr><tr><td>Svelte (v5)</td><td>16 KB</td><td><ol><li>Tiny overhead in the bundle size</li><li>Near-zero overhead in runtime</li></ol></td><td><ol><li>Basic Docs levels</li><li>Less rich ecosystem</li><li>Less guides and tutorials</li></ol></td><td><ol><li>Best for tiny apps</li><li>Best for performance-dependent apps</li><li>Can be complex for devs without any react experience</li><li>Can be harder to find devs</li></ol></td></tr></tbody></table>

## 1. App initialization

### 1.1) React - createRoot()

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.tsx";

const rootHtmlElement = document.querySelector("#root");

ReactDOM.createRoot(rootHtmlElement)
    .render(
        <React.StrictMode>
            <App/>
        </React.StrictMode>
    );
```

[Docs](https://react.dev/reference/react-dom/client/createRoot)

### 1.2) Vue - createApp()

```typescript
import {createApp} from "vue";
import App from "/app.vue";

const rootHtmlElement = document.querySelector("#root");

createApp(App)
    .mount(rootHtmlElement);
```

[Docs](https://vuejs.org/api/application.html#createapp)

### 1.3) Svelte - mount()

```typescript
import {mount} from "svelte";
import App from "./app.svelte";

const rootHtmlElement = document.querySelector("#root");

mount(App, {
    target: rootHtmlElement,
});
```

[Docs](https://svelte.dev/docs/svelte/imperative-component-api#mount)

## 2. Component definition

### 1. React - .tsx

Class-based

```tsx
import React from 'react';

// called once at inclusion

interface AppProperties {
};

class App extends React.Component<AppProperties, AppState> {

    public constructor(properties: AppProperties) {
        super(properties);

        // called once per component instance
    }

    public override render(): React.ReactNode {
        // called on every component render, the response is used in the Virtual DOM
        // ttps://www.freecodecamp.org/news/what-is-the-virtual-dom-in-react/
        return (<div></div>);
    }
}

export {App};
```

Function-based

```tsx
// called once at inclusion

interface AppProperties {
};

function App(properties: AppProperties) {
// called on both creation and every render
    return (<div></div>);
}

export {App};
```

Usage

```tsx
(<App name="my app"/>)
```

[Docs](https://react.dev/reference/react/Component)

### 2. Vue - .vue

```html

<template>
    <!-- called on every component render, the response is used in the Virtual DOM -->
    <!-- https://vuejs.org/guide/extras/rendering-mechanism.html#virtual-dom -->
    <div></div>
</template>

<script lang="ts">
    // called once at inclusion

    interface
    AppProperties
    {
    }
    ;
</script>

<script setup lang="ts">
    // called once per component instance

    const properties = defineProps < AppProperties > ();
</script>

<style scoped>
</style>
```

Usage:

```html

<template>
    <App name="my app"/>
</template>
```

[Docs](https://vuejs.org/guide/essentials/component-basics.html)

### 3. Svelte - .svelte

```html

<script module lang="ts">
    // called once at inclusion

    interface
    AppProperties
    {
    }
    ;
</script>

<script lang="ts">
    // called once per component instance

    const {name}: AppProperties = $props();
</script>

<!-- called once at compilation, then the template is turned into vanilla JS -->
<!-- https://svelte.dev/blog/virtual-dom-is-pure-overhead -->
<!-- https://dev.to/joshnuss/svelte-compiler-under-the-hood-4j20 -->
<div></div>

<style>
</style>
```

[Docs](https://svelte.dev/docs/svelte/svelte-files)

## 3. Reactive variables

### 3.1) React - useState()

```tsx
import {useState} from "react";

const [stateValue, setStateValue] = useState("initial");

// <div>{stateValue}</div>
```

[Docs](https://react.dev/reference/react/useState)

### 3.2) Vue - ref/reactive()

```typescript
import {ref, reactive} from "vue";

const stateValue = ref("initial");
const deepStateValue = reactive({count: 0})

// <div>{{ stateValue }}</div>
// <div>{{ deepStateValue.count }} </div>
```

[Docs](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)

### 3.3) Svelte - $state/.raw()

```typescript
const stateValue = $state("initial");
const shallowStateValue = $state.raw({
    plain: "text",
});

// <div>{stateValue}</div>
// <div>{shallowStateValue.plain}</div>
```

[Docs](https://svelte.dev/docs/svelte/$state)

## 4. Computed variables

### 4.1) React - useMemo()

```typescript
import {useState, useMemo} from "react";

const [stateValue, setStateValue] = useState(1);

const computedValue = useMemo(
    () => stateValue * 2, // computing function
    [stateValue] // list of the reactive variables we depend on
);

// <div>{computedValue}</div>
```

[Docs](https://react.dev/reference/react/useMemo)

### 4.2) Vue - computed()

```typescript
import {ref, computed} from "vue";

const stateValue = ref(1);

const computedValue = computed(
    () => stateValue.value * 2  // computing function
);

// note: Vue implicitly picks up function dependencies

// <div>{{ computedValue }}</div>
```

[Docs](https://vuejs.org/guide/essentials/computed.html)

### 4.3) Svelte - $derived()

```typescript
const stateValue = $state(1);

const computedValue = $derived(stateValue * 2); // computing expression
const complexComputedValue = $derived.by(() => {
    return computeSomething(stateValue);  // computing function
});

// note: Svelte implicitly picks up function dependencies

// <div>{computedValue}</div>
// <div>{complexComplutedValue}</div>
```

[Docs](https://svelte.dev/docs/svelte/$derived)

## 5. Reactive variable changes tracking

### 5.1) React - useEffect()

```typescript
import {useEffect} from "react";

const [stateValue, setStateValue] = useState("initial");

useEffect(() => {
        console.log('stateValue has changed', stateValue); // tracking function
    },
    [stateValue] // list of the reactive variables we depend on
);
```

[Docs](https://react.dev/reference/react/useEffect)

### 5.2) Vue - watchEffect()

```typescript
import {watchEffect} from "vue";

const stateValue = ref("initial");

const {stop, pause, resume} = watchEffect(() => {
    console.log('stateValue has changed', stateValue.value);  // tracking function
});

// note: Vue implicitly picks up function dependencies
```

[Docs](https://vuejs.org/api/reactivity-core.html#watcheffect)

### 5.3) Svelte - $effect()

```typescript
const stateValue = $state("initial");

$effect(() => {
    console.log('stateValue has changed', stateValue.value);  // tracking function
});

// note: Svelte implicitly picks up function dependencies
```

[Docs](https://svelte.dev/docs/svelte/$effect)

## 6. Lifecycle hooks

### 6.1) React - useEffect()

Class-based component:

```typescript
import React from "react";

class App extends React.Component {
    public override componentDidMount(): void {
        // called once after the initial render 
    }

    public override componentDidUpdate(): void {
        // called after every UI re-render (second and next renders)
    }
}
```

[Docs](https://react.dev/reference/react/Component)

Function-based component:

```typescript
import React, {useEffect} from "react";

function App(): React.ReactNode {
    useEffect(() => {
        // called once after the initial render 
    }, []); // empty dependency array means it only runs once

    useEffect(() => {
        // called after every render
    }); // no dependency array means it runs after every render
}
```

[Docs](https://react.dev/reference/react/useEffect#examples-dependencies)

### 6.2) Vue - onMounted()

```typescript
import {onMounted, onUpdated} from "vue";

onMounted(() => {
    // called once after the initial render 
});

onUpdated(() => {
    // called after every re-render (second and next renders)
});
```

[Docs](https://vuejs.org/api/composition-api-lifecycle.html)

### 6.3) Svelte - onMount()

```typescript
import {onMount, tick} from 'svelte';

onMount(() => {
    // called once after the initial render 
});

$effect.pre(() => {
    //called before every render

    tick().then(() => {
        // called after every render
    });
});
```

[Docs](https://svelte.dev/docs/svelte/lifecycle-hooks)

## 7. Direct DOM manipulations

### 7.1) React - useRef()

Class-based component

```typescript
import React, {useRef} from 'react';

class App extends React.Component {
    private readonly elementRef: React.RefObject<HTMLDivElement>;

    constructor(properties) {
        super(properties);

        this.elementRef = React.createRef();
    }

    public override render(): React.ReactNode {
        return <div ref = {this.elementRef}
        onClick = {this.focus.bind(this)}
        />;
    }

    public focus(): void {
        this.elementRef.current.focus();
    }
}
```

Function-based component

```typescript
import {useRef} from 'react';

function MyComponent() {
    const inputRef = useRef(null);

    function handleClick() {
        inputRef.current.focus();
    }

    return <input ref = {inputRef}
    onClick = {handleClick}
    />;
}
```

[Docs](https://react.dev/reference/react/useRef#manipulating-the-dom-with-a-ref)

### 7.2) Vue - useTemplateRef()

```html

<script>
    import {useTemplateRef, onMounted} from 'vue'

    // the first argument must match the ref value in the template
    const input = useTemplateRef('my-input')

    onMounted(() => {
        input.value.focus()
    })
</script>

<template>
    <input ref="my-input"/>
</template>
```

[Docs](https://vuejs.org/guide/essentials/template-refs)

### 7.3) Svelte - bind:this

```html

<script lang="ts">
    let canvas: HTMLCanvasElement;

    $effect(() => {
        const ctx = canvas.getContext('2d');
        drawStuff(ctx);
    });
</script>

<canvas bind:this={canvas}></canvas>
```

[Docs](https://svelte.dev/docs/svelte/bind#bind:this)

## 8. Application bundling

### 8.1) React

* With Vite, using the [React plugin](https://www.npmjs.com/package/@vitejs/plugin-react)

### 8.2) Vue

* With Vite, using the [Vue plugin](https://www.npmjs.com/package/@vitejs/plugin-vue)

### 8.3) Svelte

* With Vite, using the [Svelte plugin](https://www.npmjs.com/package/@sveltejs/vite-plugin-svelte)

## 9. Components library bundling

### 8.1) React

### 9.2) Vue

### 9.3) Svelte

To be available for reusing, [Svelte components should be packaged](https://svelte.dev/docs/kit/packaging), which
implies compiling TS-related resources, while
keeping `.svelte` component files as is.

> Note: In Svelte v5, you [can't compile `.svelte` component](https://github.com/sveltejs/svelte/issues/13186) into
> standalone JS with Svelte being
> externalized, so packaging is the only way to create a components' library.

Using the official [@sveltejs/package](https://www.npmjs.com/package/@sveltejs/package):

1. Add `svelte` to the `peerDependencies` section of your `package.json`
2. Add `svelte` to the `exports` section of your `package.json` with the `dist/index.js` value
3. Install the `svelte-package`
4. Package your component(s) using the command: `npm run svelte-package -i ./src -o ./dist`

Packaging does the following:

1. Compiles all `.ts` files in the `src` folder into `.js` in the `dist` folder (including declaration files and maps if
   configured in your `tsconfig.json`)
2. Copies used `.svelte` files as is - so they can be directly used in other Svelte apps

After that, you can publish your package at npmjs, and your Svelte components will be available for reusing.
