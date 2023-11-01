'use client'

import { environmentMock } from '../../../mocks/profile-mocks'
import GenericForm from '../../../components/content-edit-form'
import React from 'react'

export default function EnvironmentForm() {
    const handleSubmit = (values: { [key: string]: string | number | boolean }) => {
        console.log(values)
    }

    return <GenericForm initialValues={environmentMock} onSubmit={handleSubmit} />
}
