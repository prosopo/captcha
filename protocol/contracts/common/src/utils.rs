/// get the account id in byte array format
pub fn account_id_bytes(account: &ink::primitives::AccountId) -> &[u8; 32] {
    AsRef::<[u8; 32]>::as_ref(account)
}
