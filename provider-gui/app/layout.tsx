import { GlobalStateProvider } from '../contexts/GlobalContext'
import TopBar from '../components/topbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Provider GUI',
    description: 'GUI for managing providers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
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
