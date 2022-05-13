import React, { SyntheticEvent } from "react";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"; // TODO procaptcha types.
import { Autocomplete, TextField } from "@mui/material";

export const ExtensionAccountSelect = ({value, options, onChangeEvent}: 
        {value: InjectedAccountWithMeta | undefined, options: InjectedAccountWithMeta[], onChangeEvent: (value: InjectedAccountWithMeta | null) => void}) => {
    return (
        <Autocomplete
            disablePortal
            id="select-accounts" // TODO
            options={options}
            value={value}
            isOptionEqualToValue={(option, value) => option.address === value.address}
            onChange={(event: SyntheticEvent<Element, Event>, value: InjectedAccountWithMeta | null) => onChangeEvent(value)}
            sx={{ width: 550 }} // TODO prop
            getOptionLabel={(option: any) => `${option.meta.name}\n${option.address}`}
            renderInput={(params) => <TextField {...params} label="Select account" />} // TODO label
        />
    );
}

export default ExtensionAccountSelect;