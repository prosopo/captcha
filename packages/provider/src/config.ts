import {ProsopoConfig} from './types'
//TODO create types folder and make a types file per category of types
export default {
    defaultEnvironment: "development",
    networks: {
            development: {
                endpoint: "ws://127.0.0.1:9944",
                contract: {
                    address: "5C56RrFzD6DmghxW8LK5C9qPUEuvQYPrrKZCSzU9qBzGUJ5K",
                    deployer: "5CtZetFuv2LCehKzHs75czVUovSwVYWCP9zQeDnFZsBzWof5"
                },
                secrets: "/home/chris/dev/prosopo/secrets.json"
            },
    },
    database : {
            development: {
                endpoint: "127.0.0.1:27017",
                dbname: "prosopo"
            }
    }
} as ProsopoConfig;
