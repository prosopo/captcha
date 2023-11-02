'use client'

import { actionsMock } from '@/mocks/profile-mocks'
import GenericForm from '@/components/content-edit-form'
import React from 'react'

export default function ActionsForm() {
    const handleSubmit = (values: { [key: string]: string | number | boolean }) => {
        console.log(values)
    }

    return <GenericForm initialValues={actionsMock} onSubmit={handleSubmit} />
}
