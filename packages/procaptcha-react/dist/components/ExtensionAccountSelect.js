import { jsx as _jsx } from "react/jsx-runtime";
import { Autocomplete, TextField } from "@mui/material";
export const ExtensionAccountSelect = ({ value, options, onChange }) => {
    return (_jsx(Autocomplete, { disablePortal: true, id: "select-accounts", options: options, value: value, isOptionEqualToValue: (option, value) => option.address === value.address, onChange: (event, value) => onChange(value), sx: { width: 550 }, getOptionLabel: (option) => `${option.meta.name}\n${option.address}`, renderInput: (props) => _jsx(TextField, { ...props, label: "Select account" }) }));
};
export default ExtensionAccountSelect;
//# sourceMappingURL=ExtensionAccountSelect.js.map