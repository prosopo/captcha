'use client'

import GenericForm from '@/components/content-edit-form'
import React from 'react'

interface EnvironmentVariables {
    [key: string]: string
}

export default function ProfileSummary() {
    const handleSubmit = (values: { [key: string]: string }) => {
        console.log(values)
        // ... Add your API call here
    }

    return <GenericForm initialValues={initialValues} onSubmit={handleSubmit} />
}
