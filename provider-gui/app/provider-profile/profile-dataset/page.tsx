'use client'

import GenericForm from '@/components/content-edit-form'
import React from 'react'

export default function ProfileDatasetForm() {
    const initialValues = {
        DATASET_CONTENT_ID: 'DATASET_CONTENT_ID',
        DATASET_ID: 'DATASET_ID',
    }

    const handleSubmit = (values: { [key: string]: string }) => {
        console.log(values)
        // ... Add your API call here
    }

    return <GenericForm initialValues={initialValues} onSubmit={handleSubmit} />
}
