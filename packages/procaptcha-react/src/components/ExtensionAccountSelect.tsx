import { SyntheticEvent } from "react";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"; // TODO procaptcha types.
import { Autocomplete, TextField } from "@mui/material";

export const ExtensionAccountSelect = ({value, options, onChange}: 
        {value: InjectedAccountWithMeta | undefined, options: InjectedAccountWithMeta[], onChange: (e: SyntheticEvent<Element, Event>, value: InjectedAccountWithMeta | null) => void}) => {
    return (
        <Autocomplete
            disablePortal
            id="select-accounts"
            options={options}
            value={value}
            isOptionEqualToValue={(option, value) => option.address === value.address}
            onChange={onChange}
            sx={{ width: 550 }}
            getOptionLabel={(option: any) => `${option.meta.name}\n${option.address}`}
            renderInput={(params) => <TextField {...params} label="Select account" />}
        />
    );
}

export default ExtensionAccountSelect;