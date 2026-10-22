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

//! compositeIpAddress.ts: whether two observations of a client come from the same network. The
//! conversions to and from the stored halves live in the database crate, next to the record.

pub use prosopo_database::composite_ip::{composite_of, get_composite_ip_address, get_ip_address_from_composite};
use prosopo_database::records::CompositeIpAddress;
use prosopo_types::stored::IpAddressType;

/// The part of a v4 address treated as the host rather than the network: a /24.
const V4_HOST_BITS: u32 = 8;

/// The value `getCompositeIpAddress` gives an address it could not read.
fn is_unknown_ip(ip: &CompositeIpAddress) -> bool {
    ip.ip_type == IpAddressType::V4 && ip.lower.0 == 0
}

/// `isSameIpOrigin`: v6 compared on the /64 (the interface identifier rotates by design), v4
/// on the /24 (carrier NAT and mobile pools reassign the low octet). An address we do not
/// have counts as the same: the answer gates extra friction, and a gap in what was recorded
/// is not evidence against the user.
pub fn is_same_ip_origin(a: &CompositeIpAddress, b: &CompositeIpAddress) -> bool {
    if is_unknown_ip(a) || is_unknown_ip(b) {
        return true;
    }
    if a.ip_type != b.ip_type {
        return false;
    }
    match a.ip_type {
        IpAddressType::V6 => match (a.upper, b.upper) {
            (Some(left), Some(right)) => left == right,
            _ => true,
        },
        IpAddressType::V4 => a.lower.0 >> V4_HOST_BITS == b.lower.0 >> V4_HOST_BITS,
    }
}
