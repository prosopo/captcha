'use client'

import { summaryMock } from '../../../mocks/profile-mocks'
import GenericForm from '../../../components/content-edit-form'
import React from 'react'

export default function SummaryForm() {
    const handleSubmit = (values: { [key: string]: string | number | boolean }) => {
        console.log(values)
    }

    return <GenericForm initialValues={summaryMock} onSubmit={handleSubmit} />
}
