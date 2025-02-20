// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
    WIDGET_BORDER,
    WIDGET_BORDER_RADIUS,
    WIDGET_INNER_HEIGHT,
    WIDGET_MAX_WIDTH,
    WIDGET_MIN_HEIGHT,
    WIDGET_OUTER_HEIGHT,
    WIDGET_PADDING
} from "../WidgetConstants.js";
import type {Theme} from "../theme.js";
import type {HtmlElementFactory} from "./htmlElementFactory.js";

class WidgetElementFactory implements HtmlElementFactory {
    constructor(private readonly checkboxElementFactory: HtmlElementFactory,
                private readonly logoElementFactory: HtmlElementFactory) {
    }

    public createHtmlElement(theme: Theme): HTMLElement {
        const widgetElement = document.createElement("div");
        const checkboxElement = this.checkboxElementFactory.createHtmlElement(theme);
        const logoElement = this.logoElementFactory.createHtmlElement(theme);

        widgetElement.outerHTML = this.getStyles(theme) + this.getMarkup();

        widgetElement.querySelector(".widget__checkbox")
            ?.replaceWith(checkboxElement);

        widgetElement.querySelector(".widget__logo")
            ?.replaceWith(logoElement);

        return widgetElement;
    }

    protected getMarkup(): string {
        return `
<div class="widget">
    <div class="widget__outer">
        <div class="widget__wrapper">
            <div class="widget__inner">
                <div class="widget__dimensions" data-cy={"button-human"}>
                    {" "}
                    <div class="widget__content">
                        <div className="widget__checkbox"></div>
                        <div class="widget__logo"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    protected getStyles(theme: Theme): string {
        return `
<style>
.widget {
    width: 100%;
    min-height: ${WIDGET_MIN_HEIGHT}
}

.widget__outer {
    max-width: ${WIDGET_MAX_WIDTH};
    min-height: 100%;
    overflow-x: auto;
    width: 100%;
    font-family: ${theme.font.fontFamily};
    color: ${theme.font.color};
}

.widget__wrapper {
    container-type: size;
    display: flex;
    flex-direction: column;
    height: ${WIDGET_OUTER_HEIGHT}px;
}

.widget__inner {
    max-height: 100%;
    min-width: 100%;
    overflow: hidden;
    height: ${WIDGET_OUTER_HEIGHT}px;
    width: 100%;
    display: grid;
}

.widget__dimensions {
    max-width: ${WIDGET_MAX_WIDTH};
    min-height: ${WIDGET_OUTER_HEIGHT}px;
}

.widget__content {
    padding: ${WIDGET_PADDING};
    border: ${WIDGET_BORDER};
    background-color: ${theme.palette.background.default};
    border-color: ${theme.palette.grey[300]};
    border-radius: ${WIDGET_BORDER_RADIUS};
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    min-height: ${WIDGET_INNER_HEIGHT}px;
    overflow: hidden;
}
</style>
`;
    }
}


export {WidgetElementFactory};
