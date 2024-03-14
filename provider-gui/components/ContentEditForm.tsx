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
'use client'

import { Button, Container, Grid, TextField, Typography } from '@mui/material'
import React, { ChangeEvent, FormEvent, useState } from 'react'

interface EnvironmentVariables {
    [key: string]: string | number | boolean
}

interface GenericFormProps {
    initialValues: EnvironmentVariables
    onSubmit: (values: EnvironmentVariables) => void
}

const GenericForm: React.FC<GenericFormProps> = ({ initialValues, onSubmit }) => {
    const [values, setValues] = useState<EnvironmentVariables>(initialValues)

    const handleChange = (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
        setValues({
            ...values,
            [name]: event.target.value,
        })
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        onSubmit(values)
    }

    return (
        <Container maxWidth="md">
            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {Object.keys(values).map((key) => (
                        <React.Fragment key={key}>
                            <Grid item xs={6}>
                                <Typography>{key}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="Value" value={values[key]} onChange={handleChange(key)} />
                            </Grid>
                        </React.Fragment>
                    ))}
                    <Grid item xs={12}>
                        <Button type="submit" fullWidth variant="contained" color="primary">
                            Submit
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Container>
    )
}

export default GenericForm
