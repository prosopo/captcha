import { Octokit } from 'octokit'
import dotenv from 'dotenv'

dotenv.config()

interface Label {
    id: number
    node_id: string
    url: string
    name: string
    color: string
    default: boolean
    description: string
}

class OctokitWrapper {
    private octokit: Octokit
    constructor(private readonly owner: string, private accessToken: string) {
        this.octokit = new Octokit({ auth: accessToken })
        this.owner = owner
    }

    public async getRepoLabels(repo: string): Promise<Label[]> {
        const { data } = await this.octokit.request(`GET /repos/${this.owner}/${repo}/labels`, {
            owner: this.owner,
            repo,
        })
        return data
    }

    public async copyRepoLabels(originalRepo: string, newRepo: string) {
        const labels = await this.getRepoLabels(originalRepo)
        for (const label of labels) {
            try {
                await this.delRepoLabel(newRepo, label.name)
            } catch (e) {
                console.warn(e.message)
            }
            await this.setRepoLabel(newRepo, label)
        }
    }

    public async setRepoLabel(repo: string, label: Label) {
        console.log(label.color)
        const { data } = await this.octokit.request(`POST /repos/${this.owner}/${repo}/labels`, {
            owner: this.owner,
            repo,
            name: label.name,
            color: label.color,
            description: label.description,
            default: label.default,
        })
        return data
    }

    public async delRepoLabel(repo: string, label: string) {
        console.log(label)
        const { data } = await this.octokit.request(
            `DELETE /repos/${this.owner}/${repo}/labels/${urlEncodeString(label)}`
        )
        return data
    }
}

function urlEncodeString(str: string) {
    return str.replace(/\s/g, '%20')
}

function run() {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error('No GITHUB_TOKEN env variable set')
    }
    const octokit = new OctokitWrapper('prosopo', process.env.GITHUB_TOKEN)
    octokit.getRepoLabels('captcha').then((labels) => {
        console.log(labels)
        process.exit(0)
    })
    // octokit
    //     .copyRepoLabels('contract', 'captcha')
    //     .then(() => {
    //         console.log('done')
    //         process.exit(0)
    //     })
    //     .catch((err) => {
    //         console.error(err)
    //         process.exit(1)
    //     })
}

run()
