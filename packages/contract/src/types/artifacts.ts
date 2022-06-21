// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo-io/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import {Abi} from "@polkadot/api-contract";

export interface SpecDef {
    constructors: any[];
    docs: any[];
    events: any[];
    messages: {
        label: string;
        name: string[] | string;
        selector: string;
    }[];
}

export type AbiMetadata = {
    metadataVersion: string;
    source: {
        hash: string;
        language: string;
        compiler: string;
        wasm: string;
    };
    contract: {
        name: string;
        version: string;
        authors: string[];
    };
    spec: SpecDef;
    V1: {
        spec: SpecDef;
    };
    V2: {
        spec: SpecDef;
    };
    V3: {
        spec: SpecDef;
    };
};

export type ContractAbi = Record<string, unknown> | Abi;
