import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import TopBar from '../components/Topbar'
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
import { GlobalStateProvider } from '../contexts/GlobalContext'

const roboto = Roboto({ weight: '400', subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Provider GUI',
    description: 'GUI for managing providers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
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
