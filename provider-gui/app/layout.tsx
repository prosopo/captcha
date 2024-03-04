import { GlobalStateProvider } from '../contexts/GlobalContext'
import { Roboto } from 'next/font/google'
import TopBar from '../components/Topbar'
import type { Metadata } from 'next'

const roboto = Roboto({ weight: '400', subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Provider GUI',
    description: 'GUI for managing providers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={roboto.className}>
                <GlobalStateProvider>
                    <>
                        <TopBar />
                        {children}
                    </>
                </GlobalStateProvider>
            </body>
        </html>
    )
}
