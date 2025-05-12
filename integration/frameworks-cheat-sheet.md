# Frameworks cheat sheet

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

### 1.4) Angular - bootstrapApplication()

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent);
```

[Docs](https://angular.dev/api/platform-browser/bootstrapApplication)

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

    interface AppProperties {};
</script>

<script setup lang="ts">
    // called once per component instance

    const properties = defineProps<AppProperties>();
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

    interface AppProperties {};
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

### 4. Angular - .ts

```typescript
import { Component, Input } from "@angular/core";

// called once at inclusion

@Component({
	selector: "app-root",
	imports: [],
   // keept up to date with the Incremental DOM technique https://blog.nrwl.io/understanding-angular-ivy-incremental-dom-and-virtual-dom-243be844bf36
	template:"<div></<div>", 
    // templateUrl: "./app.component.html",
	styles: "",
	// styleUrl: "./app.component.css",
   // inputs: Object.keys({} as AppProperties) as (keyof AppProperties)[],
})

export class AppComponent {
   @Input({ required: true }) 
   name!: string;
   
   constructor() {
      // called once per component instance
   }
}
```

[Docs](https://angular.dev/guide/components)

## 3. Component lifecycle hooks

### 3.1) React - useEffect()

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

### 3.2) Vue - onMounted()

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

### 3.3) Svelte - onMount()

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

### 3.4) Angular - ngOnInit()

```typescript
export class DemoComponent {
   ngOnInit() {
      // called once after the initial render
   }
}
```

[Docs](https://angular.dev/guide/components/lifecycle)

## 4. Reactive variables

### 4.1) React - useState()

```tsx
import {useState} from "react";

const [stateValue, setStateValue] = useState("initial");

// <div>{stateValue}</div>

setStateValue("newValue");
```

[Docs](https://react.dev/reference/react/useState)

### 4.2) Vue - ref/reactive()

```typescript
import {ref, reactive} from "vue";

const stateValue = ref("initial");
const deepStateValue = reactive({count: 0})

// <div>{{ stateValue }}</div>
// <div>{{ deepStateValue.count }} </div>

stateValue.value = "newValue";
```

[Docs](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)

### 4.3) Svelte - $state/.raw()

```typescript
let stateValue = $state("initial");
const shallowStateValue = $state.raw({
    plain: "text",
});

// <div>{stateValue}</div>
// <div>{shallowStateValue.plain}</div>

stateValue = "newValue";
```

### 4.4) Angular - signal()

```typescript
import {signal} from '@angular/core';

const stateValue = signal("initial");

// <div>{{stateValue()}}</div>

stateValue.set("newValue");
```

[Docs](https://angular.dev/guide/signals)

## 5. Computed variables

### 5.1) React - useMemo()

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

### 5.2) Vue - computed()

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

### 5.3) Svelte - $derived()

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

### 5.4) Angular - computed()

```typescript
import {signal, computed} from '@angular/core';

const stateValue = signal("initial");
const computedValue = computed(() => stateValue() + " prefix")

// note: Angular implicitly picks up function dependencies

// <div>{{computedValue()}}</div>
```

[Docs](https://angular.dev/guide/signals#computed-signals)

## 6. Reactive variable changes tracking

### 6.1) React - useEffect()

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

### 6.2) Vue - watchEffect()

```typescript
import {watchEffect} from "vue";

const stateValue = ref("initial");

const {stop, pause, resume} = watchEffect(() => {
    console.log('stateValue has changed', stateValue.value);  // tracking function
});

// note: Vue implicitly picks up function dependencies
```

[Docs](https://vuejs.org/api/reactivity-core.html#watcheffect)

### 6.3) Svelte - $effect()

```typescript
const stateValue = $state("initial");

$effect(() => {
    console.log('stateValue has changed', stateValue.value);  // tracking function
});

// note: Svelte implicitly picks up function dependencies
```

[Docs](https://svelte.dev/docs/svelte/$effect)

### 6.4) Angular - effect()

```typescript
import {signal, effect} from '@angular/core';

const stateValue = signal("initial");

effect(() => {
    // distinct behavior: this function is called at least once, so includes the initial value assignment
    console.log("state value was set: " + stateValue());
});

// note: Angular implicitly picks up function dependencies

```
[Docs](https://angular.dev/api/core/effect)

## 7. Direct DOM manipulations

### 7.1) React - useRef()

Class-based component

```typescript jsx
import React, {useRef} from 'react';

class App extends React.Component {
    private readonly elementRef: React.RefObject<HTMLDivElement>;

    constructor(properties) {
        super(properties);

        this.elementRef = React.createRef();
    }

    public override render(): React.ReactNode {
        return <div ref={this.elementRef} onClick={this.focus.bind(this)}/>;
    }

    public focus(): void {
        this.elementRef.current.focus();
    }
}
```

Function-based component

```typescript jsx
import {useRef} from 'react';

function MyComponent() {
    const inputRef = useRef(null);

    function handleClick() {
        inputRef.current.focus();
    }

    return <input ref={inputRef} onClick={handleClick}/>;
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

### 7.4) Angular - @ViewChild

```typescript
import {afterRender, ElementRef, inject, ViewChild} from "@angular/core";

export class AppComponent {
   elementRef = inject(ElementRef);
   @ViewChild("intro") intro!: ElementRef;

   constructor() {
      afterRender(() => {
         this.elementRef.nativeElement.classList.add("loaded");
         this.intro.nativeElement.classList.add("loaded2");
      });
   }
}
```

[Docs](https://angular.dev/api/core/ViewChild)

## 8. Application bundling

### 8.1) React

* With Vite, using the [React plugin](https://www.npmjs.com/package/@vitejs/plugin-react)

### 8.2) Vue

* With Vite, using the [Vue plugin](https://www.npmjs.com/package/@vitejs/plugin-vue)

### 8.3) Svelte

* With Vite, using the [Svelte plugin](https://www.npmjs.com/package/@sveltejs/vite-plugin-svelte)

### 8.4) Angular

* Using [Angular-CLI](https://github.com/angular/angular-cli)

## 9. Components library bundling

### 9.1) React

Unlike the app bundling case, to make a reusable components library we need to compile only the component-related code,
while keeping React as a `peer` (external) dependency, so it'll be pickup up from the target application.

* With Vite, using the [React plugin](https://www.npmjs.com/package/@vitejs/plugin-react):

1. Add `react` to the `peerDependencies` section of your `package.json`
2. Configure the [Vite Library mode](https://vite.dev/guide/build#library-mode)
3. Add `react` to the `external` section of the
   Vite [build.rollupOptions](https://vite.dev/config/build-options#build-rollupoptions) setting
4. Run `vite build` or `vite dev`

### 9.2) Vue

Unlike the app bundling case, to make a reusable components library we need to compile only the component-related code,
while keeping React as a `peer` (external) dependency, so it'll be pickup up from the target application.

* With Vite, using the [Vue plugin](https://www.npmjs.com/package/@vitejs/plugin-vue):

1. Add `vue` to the `peerDependencies` section of your `package.json`
2. Configure the [Vite Library mode](https://vite.dev/guide/build#library-mode)
3. Add `vue` to the `external` section of the
   Vite [build.rollupOptions](https://vite.dev/config/build-options#build-rollupoptions) setting
4. Run `vite build` or `vite dev`

### 9.3) Svelte

To be available for reusing, [Svelte components should be packaged](https://svelte.dev/docs/kit/packaging), which
implies compiling TS-related resources, while keeping `.svelte` component files as is.

> Note: In Svelte v5, you [can't compile `.svelte` component](https://github.com/sveltejs/svelte/issues/13186) into
> standalone JS with Svelte being
> externalized, so packaging is the only way to create a components' library.

Using the official [@sveltejs/package](https://www.npmjs.com/package/@sveltejs/package):

1. Add `svelte` to the `peerDependencies` section of your `package.json`
2. Add `svelte` to the `exports` section of your `package.json` with the `dist/index.js` value
3. Install the `svelte-package` tool
4. Package your component(s) using the command: `npm run svelte-package -i ./src -o ./dist`

Packaging does the following:

1. Compiles all `.ts` files in the `src` folder into `.js` in the `dist` folder (including declaration files and maps if
   configured in your `tsconfig.json`)
2. Copies used `.svelte` files as is - so they can be directly used in other Svelte apps

After that, you can publish your package at npmjs, and your Svelte components will be available for reusing.

### 9.4) Angular

To be available for reusing, components package should be made in the [Angular package format](https://angular.dev/tools/libraries/angular-package-format).

Using the official [ng-packagr](https://www.npmjs.com/package/ng-packagr):

1. Add `@angular/core` to the `peerDependencies` section of your `package.json`
2. Install the `ng-packagr` tool
3. Create `ng-package.json` file - Angular library configuration file with the following content: `{"$schema": "./node_modules/ng-packagr/ng-package.schema.json"}`
4. Add component exports to the `src/public_api.ts` file (a custom entry can be [configured in the config](https://github.com/ng-packagr/ng-packagr/blob/HEAD/docs/entry-file.md))
5. Package your component(s) using the command: `ng-packagr -p ng-package.json`

Packaging does the following:

1. Compiles all `.ts` files in the `src` folder into `fesm2022/{package-name}.mjs` in the `dist` folder (including declaration files and maps if
   configured in your `tsconfig.json`)
2. Copies your `package.json` to the `dist` folder and customizes the `exports` section

After that, you can publish your package from the `dist` folder at npmjs, and your Angular components will be available for reusing.
