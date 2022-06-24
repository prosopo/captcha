use ink_prelude::{string::String, vec::Vec};
use serde::Serialize;

#[derive(Serialize)]
pub struct Metadata {
    pub name: String,
    pub description: String,
    pub image: String,
}

// TODO: make this generatable (upload images and generate structs with new urls)
// TODO: simplify/lessen the amount of content
pub mod Nfts {
    use super::*;

    const DESC: &'static str = "Generated via https://bigheads.io/";

    pub const PRICE: u128 = 2_000_000_000_000;

    pub fn get_list() -> Vec<Metadata> {
        Vec::from([
            Metadata {
                name: String::from("bighead#1"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmP21XpHejADs9w9aw1E8ZAWWq82xqHgiSqqxukkaUVAv7",
                ),
            },
            Metadata {
                name: String::from("bighead#2"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZh4VadsPobR2HJhQVbSTBnaeDKZ8yqGiuP8kSTesrEBV",
                ),
            },
            Metadata {
                name: String::from("bighead#3"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmWsgeYzBkFDoM9nK3gaYzs3Dw5hJSoScRjXy8USt8uZ6J",
                ),
            },
            Metadata {
                name: String::from("bighead#4"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmXnswzFNghpt2iKgHdJFXx4ZPwXw8Ze8p6fKexkvKu6oA",
                ),
            },
            Metadata {
                name: String::from("bighead#5"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdWUpMuiUx5FgzLDs6DpK7xzwhPsF9CH5USXnYNaH2WZk",
                ),
            },
            Metadata {
                name: String::from("bighead#6"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmbtE7u1ZqtCtkrEM9ftAPLaiUEFnJF96k1tT4LmCRRA5d",
                ),
            },
            Metadata {
                name: String::from("bighead#7"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmeEauq5anBm2PYXpdPRMBEBFwbPUaHB6qdT19BAtfbnyP",
                ),
            },
            Metadata {
                name: String::from("bighead#8"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmXkVMnMdfZbyAjDwbkfde1DGUcVC8UCxbE2e4zameMNti",
                ),
            },
            Metadata {
                name: String::from("bighead#9"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmS4AJ54stBo72oYk2CKeep6HGQqrqEPZX8rFRvMrrjcz1",
                ),
            },
            Metadata {
                name: String::from("bighead#10"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmaepV9iNhL1USUAGyLSCpRsYTQKo39pJJrm3gsPifKywq",
                ),
            },
            Metadata {
                name: String::from("bighead#11"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmb7KA3BG1L3HW5wG3b7Sysz6kmAo183bAbGtDLHtuHn7a",
                ),
            },
            Metadata {
                name: String::from("bighead#12"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmcSivq32FQtMMxpGS8Za41nWxuz556KQj1uKhovsVR3XG",
                ),
            },
            Metadata {
                name: String::from("bighead#13"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmStSP1U1NbozuLLf15p1VFUNhJbeZLjShMgMo4cTbvRZb",
                ),
            },
            Metadata {
                name: String::from("bighead#14"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPdbmBTVuXFkacXvpWtXwoMs56SMhz5UjBvBMKwtBDNDe",
                ),
            },
            Metadata {
                name: String::from("bighead#15"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmaaodfTTB3RrRhFmiBHeEA8Qs2w5ETeuDnc5e57ZfzchZ",
                ),
            },
            Metadata {
                name: String::from("bighead#16"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmboNBwWrbECYCnRNhjf7aiJs6XxeTpiXtDrfKekXaiVgQ",
                ),
            },
            Metadata {
                name: String::from("bighead#17"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmWPVYuFmemj2u9jR7vo4QKgMXsMguNAR8vLAc9t6swVhu",
                ),
            },
            Metadata {
                name: String::from("bighead#18"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmQWhmY26bjFcVeUZi1rZE8yEftXFGf5mzArr2ZjvMQSU9",
                ),
            },
            Metadata {
                name: String::from("bighead#19"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmUiX7YHapMQvg8tL2ftBRWvQj7i1bgGp2Zfgjvh8KxHk8",
                ),
            },
            Metadata {
                name: String::from("bighead#20"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdGE1bK4nfJzHgNHfXwoq9Fop9fPmwVLvxA9pC86pXvTG",
                ),
            },
            Metadata {
                name: String::from("bighead#21"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmQCfpqeBNWafZeZ8TPSMjTXjKDmfpBZUMAjJLqtWRqYek",
                ),
            },
            Metadata {
                name: String::from("bighead#22"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmVWjxFT6JpPb9gPL3RwWgiRFhHDJjLf719PakEBMTNP2B",
                ),
            },
            Metadata {
                name: String::from("bighead#23"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmc3Ho3xbbVHa9mBbuDhPmpfiHoqKX9cQq9AswKYbe9Noo",
                ),
            },
            Metadata {
                name: String::from("bighead#24"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmRaCcHUtbaYTSQtyxNMmyDQEw2Ehy8curGFuoepRjcP1r",
                ),
            },
            Metadata {
                name: String::from("bighead#25"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmNUuuud7oeRiinwU2yoWTiToAQhZtSKkjK6Cvcu2zVGwx",
                ),
            },
            Metadata {
                name: String::from("bighead#26"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPQBxhrsbDeD2WcdJZecXUuauywdJEPeMxh1G1NjwgePR",
                ),
            },
            Metadata {
                name: String::from("bighead#27"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmd7dWXPeMtYL3a79oLsWNcAZwPjimzWoFEPg4F66Q6r9x",
                ),
            },
            Metadata {
                name: String::from("bighead#28"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmWXSFvJFnqkjQJRZsiD2rsiTKSBGT1V7qDYcs5LC6NsQA",
                ),
            },
            Metadata {
                name: String::from("bighead#29"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPmWuDyjay4aJwu3EefKriJxDGekdhQH6JRYdncHoTcYR",
                ),
            },
            Metadata {
                name: String::from("bighead#30"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPPZF9wyBgRsAKjtBFmh9iDXPnjZG5rbgk2TYaMWw8hJi",
                ),
            },
            Metadata {
                name: String::from("bighead#31"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmNPpBLvCU5uqV2VZC7zYV8vQWz6cwWmgXzhfCPzmUkBo6",
                ),
            },
            Metadata {
                name: String::from("bighead#32"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmaj8S4zyAVda8ggJzkTNN9UbKvP5vgrDTZoL4YzEZTJxt",
                ),
            },
            Metadata {
                name: String::from("bighead#33"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmegLxgXQfHRXZi8LYUu5a6W8pMNHc9cLLqeUzsbnMAEXy",
                ),
            },
            Metadata {
                name: String::from("bighead#34"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmUtbGAty3AWkCwpVPKTGnoU6xrALXGnbfhwcMKcsYw8XE",
                ),
            },
            Metadata {
                name: String::from("bighead#35"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdDXJ7dGsfadQWYBtFxzDDcUYeX81TKfncSMacAf5F3i5",
                ),
            },
            Metadata {
                name: String::from("bighead#36"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmTSuHe1km4yjDi6qeNqnkefFhK3ePcuFxBF9wv379puca",
                ),
            },
            Metadata {
                name: String::from("bighead#37"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmUvp7meS1Bfc6PQQu259SVSnhZUyzvJ1SixiNvw7TMQqk",
                ),
            },
            Metadata {
                name: String::from("bighead#38"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmfNz1BDXEds5MDF2G3kJBEXDrVqjnFhUbEZaqB37xvqGp",
                ),
            },
            Metadata {
                name: String::from("bighead#39"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmfFGgSQS9V94LPw4Tvo5uGpxkbpJjyZtwB7C4pFP1TJKg",
                ),
            },
            Metadata {
                name: String::from("bighead#40"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmeMmPVXMykwYFZYRvvxH58pvgvbLjVKqdmCp5yYjKL1p4",
                ),
            },
            Metadata {
                name: String::from("bighead#41"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmTNmBeckZZPnj1cwfUxj5duCUmxt6cD7Se6f8LpHGh5KB",
                ),
            },
            Metadata {
                name: String::from("bighead#42"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZaAaJS6ThAexgaqaGhV7g89qZDYwcM2TKz1BzRKFBhRU",
                ),
            },
            Metadata {
                name: String::from("bighead#43"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmW5iFgg86XWFRt4EiQckLWdRNzsQLMiJXwNUP75ueFimL",
                ),
            },
            Metadata {
                name: String::from("bighead#44"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmTEFr1ygze9jQG6Sbs78xSoTiLH9e33NyjzUcJ7VrFX1X",
                ),
            },
            Metadata {
                name: String::from("bighead#45"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmeCynJHfYLnbEnV2U62UHKc1RtvB3oxAW8DiHHDkVR857",
                ),
            },
            Metadata {
                name: String::from("bighead#46"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmNMXtXVL16Gr7WRSLBAHYswtADhB8eVg3NEufPjKXDndw",
                ),
            },
            Metadata {
                name: String::from("bighead#47"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmWB6M856frMicwoRPCCrCu95sfu7nmARVSQDW1TPUbbTU",
                ),
            },
            Metadata {
                name: String::from("bighead#48"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmSLXURrNwNw35k8CvNbkPSTzE8zutvmu74NtHaikXWE9a",
                ),
            },
            Metadata {
                name: String::from("bighead#49"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmeLZa9WsEYHUpsXDeB7VshzP19dRstTTy569LaJXQPmZk",
                ),
            },
            Metadata {
                name: String::from("bighead#50"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmR86JieG9rypLfkRWgv8YPo7chi8dGP8hTCWX4ST3WEwt",
                ),
            },
            Metadata {
                name: String::from("bighead#51"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmNayfR5t6f5ZkYA685afs6R1F3h7uu9tH3egmW2GjVrgG",
                ),
            },
            Metadata {
                name: String::from("bighead#52"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmRo5sHBABDCcdbnFdZe3GdfP8hXhci4YLWMBGf1H6cXy2",
                ),
            },
            Metadata {
                name: String::from("bighead#53"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmcEV93YxNpiaMasJVSndemwRwjEKjfEAhS2Nxs1cJEYUP",
                ),
            },
            Metadata {
                name: String::from("bighead#54"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmSJgAxcHxXnf6wpJpEudeSVsHuUmWyt5XdjEcCCAH8fyy",
                ),
            },
            Metadata {
                name: String::from("bighead#55"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmbTK77n14UmxNTGwSdzULsCYk2waLkVqC9PRfdvzTrkzc",
                ),
            },
            Metadata {
                name: String::from("bighead#56"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdgHJA1hrDBKTMPFHFXoyPNXavXep1UR38m4755Xjoh8N",
                ),
            },
            Metadata {
                name: String::from("bighead#57"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmNcsVyhnZCmr9sAtAtfxEZ1YJt8hAirS1ZmP99FcFRPnL",
                ),
            },
            Metadata {
                name: String::from("bighead#58"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZfw8LfrRzjVMVxW8QsZMTiYXCYMX2atxAQKL5CVowySt",
                ),
            },
            Metadata {
                name: String::from("bighead#59"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmcSBFsTTgqjPEbSFhG33koT1FMabfEi3Y5DXyLShCbPuo",
                ),
            },
            Metadata {
                name: String::from("bighead#60"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qme1hTR1tppxQwZe6XcvPYSVUHpdhGKVUKsVnH1CcempG8",
                ),
            },
            Metadata {
                name: String::from("bighead#61"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPwad7q97q7u3KXwBuDyB5oAiJy7nJe74uEAg3xpcseE4",
                ),
            },
            Metadata {
                name: String::from("bighead#62"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmWAnKHtDq5BHLU8XffmdaA5r2fsmv1oURAidmucxUUPHs",
                ),
            },
            Metadata {
                name: String::from("bighead#63"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdizxCM3ggJ2wpsSWGdYxi82LQ8w735zfS1FPy1Xhvub5",
                ),
            },
            Metadata {
                name: String::from("bighead#64"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmQWs61A6qp4qorJWgszhZSHeJzVrGmA8EyzfRF4Q1AjJ4",
                ),
            },
            Metadata {
                name: String::from("bighead#65"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmYr9LuGkrN17m4uuQxZnSkcCscU6zmEFtAh2PXxSZ8WJe",
                ),
            },
            Metadata {
                name: String::from("bighead#66"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmX2CL1FVJUjgcFGcytT6wGsvBY3KDeX2Ktpy5C5GTqcAv",
                ),
            },
            Metadata {
                name: String::from("bighead#67"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmQ62pCTfAdmMxgWF9a6ibbVQkzthiU7YkY4GNxX4KyT5h",
                ),
            },
            Metadata {
                name: String::from("bighead#68"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZSf1dPDe2xNHa3ynFggcCnKW511GEEBuAf5Hkmdmd2dM",
                ),
            },
            Metadata {
                name: String::from("bighead#69"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmSxG7UBJCCTPna922gvNf6UdcciYeRS7qjzKqqjfSe474",
                ),
            },
            Metadata {
                name: String::from("bighead#70"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPExRVyj6mugGPxn16NC9hPaoKeC8eN6PaELNFybKRMhU",
                ),
            },
            Metadata {
                name: String::from("bighead#71"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmcuns7oknVvKDtyD4yHmR3vgYLxEay89ic2M3b94VDw4b",
                ),
            },
            Metadata {
                name: String::from("bighead#72"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdXQEsvK5Nh6L7u1pKECENznG5ufAaeXDb8adH5A3zdRx",
                ),
            },
            Metadata {
                name: String::from("bighead#73"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmcia4dwh5CUyboo5f2JuKEg2LVYYsS6BjPg8F63wAzrh1",
                ),
            },
            Metadata {
                name: String::from("bighead#74"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdxHQH6pwevGTQq9JhP4XQiTQns27EtYEU7zuJjrHgVq3",
                ),
            },
            Metadata {
                name: String::from("bighead#75"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmVFFgkxVvK4Z8GmhcaFGMcuqJLPdoRv6TkcTdZPPKPdWa",
                ),
            },
            Metadata {
                name: String::from("bighead#76"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmRAtw5Zbw8n9SFG2tMbrgJmsugvWtjJGVFBqimc5LJApV",
                ),
            },
            Metadata {
                name: String::from("bighead#77"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmT7TV2p3om5PuGd6W4HPEve6vMxsqEiMp6Bdjoyr6Cqq8",
                ),
            },
            Metadata {
                name: String::from("bighead#78"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmQjcSA78XND7seoMK61p89QhP3prPxGCS8kGb9hxRBf83",
                ),
            },
            Metadata {
                name: String::from("bighead#79"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmfGirn9SREcVCEV26NfAfHtV3hzwZvDVCMd3yMzgwCSjf",
                ),
            },
            Metadata {
                name: String::from("bighead#80"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmWQPVNDXAJF28JaD8ruDSp55GoNsDJ7fqfUoHcPK6UPyb",
                ),
            },
            Metadata {
                name: String::from("bighead#81"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qma7dw49yoW1Yobe85gkWCXE5w9qH7i3fYNU2Ru5m1Zi6H",
                ),
            },
            Metadata {
                name: String::from("bighead#82"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmXQyRk2GjJs6hFK7ZUhZGUxj25nLQt5T21hqWCyvgTyHA",
                ),
            },
            Metadata {
                name: String::from("bighead#83"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmaHir8wNDpGmTr4JzC9aAXoz3AHJEjkZw2x1JykFvL1We",
                ),
            },
            Metadata {
                name: String::from("bighead#84"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmTiJosFZL7cmZSbWBxPVXQwjDsFY4NswEdsvDPNpdh3PB",
                ),
            },
            Metadata {
                name: String::from("bighead#85"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmPjGnnPunE7QWERMr94hsEPBfuKSggpNZf6xP2SYAjc23",
                ),
            },
            Metadata {
                name: String::from("bighead#86"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZzWNDXmHXvnWuPokbCdmcXbAo8yycntwSfQwAee8HSaq",
                ),
            },
            Metadata {
                name: String::from("bighead#87"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZ2xEYVdZJWoRSzD5wshHqPJQkxPixSFWh2oDcFFhmN4Q",
                ),
            },
            Metadata {
                name: String::from("bighead#88"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmVMbi6ddK23xw11wxPoCXTr5tyMk3GmPsAVNNkaRBqXc6",
                ),
            },
            Metadata {
                name: String::from("bighead#89"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmXMAaUf8hA64ayn9oSdBVpvn4L1Xxf3ddskTQWxspiMBp",
                ),
            },
            Metadata {
                name: String::from("bighead#90"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmY4nw7T1jGGj3PddpFazUzUVCtiv8Wpa53s6nfnUU3W6s",
                ),
            },
            Metadata {
                name: String::from("bighead#91"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmYLv4DGfVfQqHbzRTfP5Sn57Pk3uquNctLeKJB1mYfJdq",
                ),
            },
            Metadata {
                name: String::from("bighead#92"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmSrMxVnkX4RvDfB5JVnLZG822F6Vb7fm6TvJiRDFNbBdS",
                ),
            },
            Metadata {
                name: String::from("bighead#93"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/Qmc7mf4MF2R73vtBB4BpKt7USGDaiMvcAfLJiZPpLJpX5Y",
                ),
            },
            Metadata {
                name: String::from("bighead#94"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmYTPXAqBL8t9HXDCRv9cRGfY6gQ15zxPZhmjPSVtkjkww",
                ),
            },
            Metadata {
                name: String::from("bighead#95"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmbjiEJFAp2qR3fx1CHbkhahimDih6CHqYEC6L8e4qhf1F",
                ),
            },
            Metadata {
                name: String::from("bighead#96"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmTCngs49B83K6tuNYaKwv4D1qEFysRgD4ZJbxr63jLbYC",
                ),
            },
            Metadata {
                name: String::from("bighead#97"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmTovUzUpAH5LUD5LrKY11xFCjnCZvYJT6ZsSrtyxsLiPW",
                ),
            },
            Metadata {
                name: String::from("bighead#98"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmZdZJXcoYwbVpyKcz4GhKgJd9YeuzwSHNBshe18PrM7RB",
                ),
            },
            Metadata {
                name: String::from("bighead#99"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmRifjQQdVJXC2zSxf5QAmfJA5sdnLf1UUDWzzQMVgXGq6",
                ),
            },
            Metadata {
                name: String::from("bighead#100"),
                description: String::from(DESC),
                image: String::from(
                    "https://ipfs.io/ipfs/QmdRZ9iVSEtaeDd8Gd9tM4ZdGTUbx6ffFiDVxnBvuefMLJ",
                ),
            },
        ])
    }
}
