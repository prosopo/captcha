const CURRENT_ACCOUNT_KEY = "@prosopo/current_account";

/**
 * Sets default `account`
 */
function setAccount(account: string) {
    localStorage.setItem(CURRENT_ACCOUNT_KEY, account);
}

/**
 * Gets default `account`
 */
function getAccount() {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY);
}

export default {
    setAccount,
    getAccount
}
