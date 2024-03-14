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

import { Button, Step, StepLabel, Stepper, TextField } from '@mui/material'
import React, { useState } from 'react'

enum RegistrationSteps {
    Account = 'Account Details',
    Folder = 'Folder Details',
    Data = 'Data Details',
    Amount = 'Amount Details',
}

export default function RegistrationStepper() {
    const [activeStep, setActiveStep] = useState(0)

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1)
    }

    const steps = Object.values(RegistrationSteps)

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return <StepOne />
            case 1:
                return <StepTwo />
            case 2:
                return <StepThree />
            case 3:
                return <StepFour />
            default:
                return 'Unknown step'
        }
    }

    return (
        <div>
            <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>
            <div>
                {getStepContent(activeStep)}
                <Button disabled={activeStep === 0} onClick={handleBack}>
                    Back
                </Button>
                <Button variant="contained" color="primary" onClick={handleNext}>
                    {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
            </div>
        </div>
    )
}

const StepOne: React.FC = () => (
    <>
        <TextField label="Account" />
        <TextField label="URL" />
        <TextField label="Payee" />
        <TextField label="Fee" />
    </>
)

const StepTwo: React.FC = () => (
    <>
        <TextField label="Folder" />
        <TextField label="URL" />
    </>
)

const StepThree: React.FC = () => (
    <>
        <TextField label="Labelled Data" />
        <TextField label="Unlabelled Data" />
        <TextField label="Labels" />
    </>
)

const StepFour: React.FC = () => <TextField label="Amount" />
