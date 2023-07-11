import TopBar from '@/components/topbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Provider GUI',
    description: 'GUI for managing providers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <TopBar />
            <body>{children}</body>
        </html>
    )
}
