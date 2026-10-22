// Copyright 2021-2026 Prosopo (UK) Ltd.
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

//! compositeIpAddress.ts's conversions: an address as the two 64-bit halves the records store,
//! and back.

use crate::records::{CompositeIpAddress, IpHalf};
use prosopo_types::stored::IpAddressType;
use prosopo_util::{get_ip_address, Address4, Address6, IpAddress};

const V6_LOWER_MASK: u128 = (1 << 64) - 1;

/// `getCompositeIpAddress`: an address the text cannot be read as is 0.0.0.0.
pub fn get_composite_ip_address(ip: &str) -> CompositeIpAddress {
    match get_ip_address(ip) {
        Ok(address) => composite_of(&address),
        Err(_) => CompositeIpAddress {
            lower: IpHalf(0),
            upper: None,
            ip_type: IpAddressType::V4,
        },
    }
}

/// `getCompositeIpAddress` of an address already read.
pub fn composite_of(address: &IpAddress) -> CompositeIpAddress {
    let numeric: u128 = address.big_int();
    if address.is_v4() {
        return CompositeIpAddress {
            lower: IpHalf(numeric as u64),
            upper: None,
            ip_type: IpAddressType::V4,
        };
    }
    CompositeIpAddress {
        lower: IpHalf((numeric & V6_LOWER_MASK) as u64),
        upper: Some(IpHalf((numeric >> 64) as u64)),
        ip_type: IpAddressType::V6,
    }
}

/// `getIpAddressFromComposite`.
pub fn get_ip_address_from_composite(composite: &CompositeIpAddress) -> Result<IpAddress, prosopo_util::UtilError> {
    match composite.ip_type {
        IpAddressType::V4 => Address4::from_big_int(u128::from(composite.lower.0)).map(IpAddress::V4),
        IpAddressType::V6 => {
            let upper: u128 = composite.upper.map_or(0, |upper| u128::from(upper.0));
            Ok(IpAddress::V6(Address6::from_big_int((upper << 64) | u128::from(composite.lower.0))))
        }
    }
}
