// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.
import { SyntheticEvent } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { TExtensionAccount } from '@prosopo/procaptcha'
import { useTranslation } from '@prosopo/i18n'

export const ExtensionAccountSelect = ({
    value,
    options,
    onChange,
}: {
    value?: TExtensionAccount
    options: TExtensionAccount[]
    onChange: (value: TExtensionAccount | null) => void
}) => {
    const { t } = useTranslation()

    return (
        <Autocomplete
            disablePortal
            id="select-accounts"
            options={options}
            value={value}
            isOptionEqualToValue={(option, value) => option.address === value.address}
            onChange={(event: SyntheticEvent<Element, Event>, value: TExtensionAccount | null) => onChange(value)}
            sx={{ width: 550 }}
            getOptionLabel={(option: any) => `${option.meta.name}\n${option.address}`}
            renderInput={(props) => <TextField {...props} label={t('WIDGET.SELECT_ACCOUNT')} />}
        />
    )
}

export default ExtensionAccountSelect
