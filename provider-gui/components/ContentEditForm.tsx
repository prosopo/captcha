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
