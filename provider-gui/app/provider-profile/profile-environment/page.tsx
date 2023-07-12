'use client'

import { environmentMock } from '@/mocks/profile-mocks'
import GenericForm from '@/components/content-edit-form'
import React from 'react'

export default function EnvironmentVariablesForm() {
    const handleSubmit = (values: { [key: string]: string | number | boolean }) => {
        console.log(values)
        // ... Add your API call here
    }

    return <GenericForm initialValues={environmentMock} onSubmit={handleSubmit} />
}
