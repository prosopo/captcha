import { SyntheticEvent } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { TExtensionAccount } from "@prosopo/procaptcha";


export const ExtensionAccountSelect = ({value, options, onChange}: 
        {value: TExtensionAccount | undefined, options: TExtensionAccount[], onChange: (value: TExtensionAccount | null) => void}) => {
    return (
        <Autocomplete
            disablePortal
            id="select-accounts" // TODO
            options={options}
            value={value}
            isOptionEqualToValue={(option, value) => option.address === value.address}
            onChange={(event: SyntheticEvent<Element, Event>, value: TExtensionAccount | null) => onChange(value)}
            sx={{ width: 550 }} // TODO prop
            getOptionLabel={(option: any) => `${option.meta.name}\n${option.address}`}
            renderInput={(props) => <TextField {...props} label="Select account" />} // TODO label
        />
    );
}

export default ExtensionAccountSelect;