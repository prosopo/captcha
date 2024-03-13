import styled from '@emotion/styled'
import { WIDGET_OUTER_HEIGHT } from './WidgetConstants.js'

export const ContainerDiv = styled.div`
    container-type: inline-size;
`

export const WidthBasedStylesDiv = styled.div`
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
    height: ${WIDGET_OUTER_HEIGHT}px;
    @container (max-width: 243px) {
        #logo-without-text {
            display: none;
        }

        #logo-with-text {
            display: none;
        }
    }
    @container (min-width: 244px) and (max-width: 339px) {
        #logo-without-text {
            display: inherit;
        }

        #logo-with-text {
            display: none;
        }
    }
    @container (min-width: 340px) {
        #logo-without-text {
            display: none;
        }

        #logo-with-text {
            display: inherit;
        }
    }
`
