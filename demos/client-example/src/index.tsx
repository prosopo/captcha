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
import { CssBaseline } from '@mui/material'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import FrictionlessRoot from './routes/frictionless.js'
import ImageCaptchaRoot from './routes/root.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import reportWebVitals from './reportWebVitals.js'

const router = createBrowserRouter([
    {
        path: '/',
        element: <ImageCaptchaRoot />,
    },
    {
        path: '/frictionless',
        element: <FrictionlessRoot />,
    },
])

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
    <React.Fragment>
        <CssBaseline />
        <RouterProvider router={router} />
    </React.Fragment>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
