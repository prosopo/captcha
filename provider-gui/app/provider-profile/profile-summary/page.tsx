'use client'

import { environmentMock } from '@/app/mocks/profile-mock-data'
import GenericForm from '@/components/content-edit-form'
import React from 'react'

export default function ProfileSummary() {
    const handleSubmit = (values: { [key: string]: string }) => {
        console.log(values)
        // ... Add your API call here
    }

    return <GenericForm initialValues={environmentMock} onSubmit={handleSubmit} />
}
