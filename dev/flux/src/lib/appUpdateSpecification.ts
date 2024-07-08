// Example of an AppUpdateSpecification Object
// {
//     "name": "emailTriggerServer",
//     "compose": [
//     {
//         "name": "emailTriggerSignupApi",
//         "description": "emailTriggerSignupApi",
//         "repotag": "prosopo/email-trigger-server:latest",
//         "ports": "[3400]",
//         "domains": "[\"email.prosopo.io\"]",
//         "environmentParameters": "[]",
//         "commands": "[]",
//         "containerPorts": "[9232]",
//         "containerData": "/data",
//         "cpu": 1,
//         "ram": 1100,
//         "hdd": 5,
//         "tiered": false,
//         "secrets": "-----BEGIN PGP MESSAGE-----\n=yFqX\n-----END PGP MESSAGE-----\n",
//         "repoauth": ""
//     }
// ],
//     "contacts": "[\"dev@prosopo.io\"]",
//     "description": "Triggers email sends for signups",
//     "expire": 195800,
//     "geolocation": [],
//     "hash": "1dec38f3fc41dd353afb75c7fa17a6f051018f1cbf6266f730f235eb15f966ba",
//     "height": 1663852,
//     "instances": 3,
//     "owner": "15gSe8HrNhVrWph6CTPtpb6nXESqPtgCCe",
//     "version": 7,
//     "nodes": [
//     "65.109.20.197",
//     "65.109.91.17",
// ],
//     "staticip": false
// }

export interface AppUpdateSpecification {
    name: string
    compose: {
        name: string
        description: string
        repotag: string
        ports: string
        domains: string
        environmentParameters: string
        commands: string
        containerPorts: string
        containerData: string
        cpu: number
        ram: number
        hdd: number
        tiered: boolean
        secrets: string
        repoauth: string
    }[]
    contacts: string
    description: string
    expire: number
    geolocation: string[]
    hash: string
    height: number
    instances: number
    owner: string
    version: number
    nodes: string[]
    staticip: boolean
}
