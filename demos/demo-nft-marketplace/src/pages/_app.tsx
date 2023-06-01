import '../styles/global.css'
import { AppProps } from 'next/app'
import { ProsopoProvider } from 'components/Prosopo'
import { useRouter } from 'next/router'
import LoadingBar, { LoadingBarRef } from 'react-top-loading-bar'
import Navbar from 'components/Navbar/Navbar'
import React, { FC, useEffect, useRef } from 'react'

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
    const ref = useRef<LoadingBarRef>(null)

    const router = useRouter()

    useEffect(() => {
        const startLoadingBar = () => ref.current.continuousStart(0, 0)
        const completeLoadingBar = () => ref.current.complete()

        router.events.on('routeChangeStart', startLoadingBar)
        router.events.on('routeChangeComplete', completeLoadingBar)
        return () => {
            router.events.off('routeChangeStart', startLoadingBar)
            router.events.off('routeChangeComplete', completeLoadingBar)
        }
    }, [router.events])

    return (
        <ProsopoProvider>
            <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
            <style>model-viewer {'{height:100%;max-height:100%;}'}</style>
            <LoadingBar ref={ref} color="#FD4857" />
            <Navbar />
            <Component {...pageProps} />
        </ProsopoProvider>
    )
}

export default App
