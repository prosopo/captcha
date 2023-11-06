'use client'

import { datasetMock } from '@/mocks/profile-mocks'
import GenericForm from '@/components/ContentEditForm'
import React from 'react'

export default function DatasetForm() {
    const handleSubmit = (values: { [key: string]: string | number | boolean }) => {
        console.log(values)
    }

    return <GenericForm initialValues={datasetMock} onSubmit={handleSubmit} />
}
