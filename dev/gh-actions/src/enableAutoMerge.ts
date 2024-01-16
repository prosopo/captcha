import { graphql } from '@octokit/graphql'

const main = async () => {
    if (process.env.GITHUB_TOKEN === undefined) {
        throw new Error('GITHUB_TOKEN env variable not set')
    }
    if (process.env.PR_NUMBER === undefined) {
        throw new Error('PR_NUMBER env variable not set')
    }

    // TODO get the type from graphql definition
    const pr: any = await graphql(
        `  
    query {
      repository(owner: "prosopo", name: "captcha") {
        pullRequest(number: ${process.env.PR_NUMBER}) {
          id
        }
      }
    }
  `,
        {
            headers: {
                authorization: `token ` + process.env.GITHUB_TOKEN,
            },
        }
    )

    await graphql(
        `    
    mutation {
      enablePullRequestAutoMerge(input: {
        pullRequestId: "${pr.repository.pullRequest.id}",
        mergeMethod: SQUASH
      }) {
        pullRequest {
          id
        }
      }
    }
    `,
        {
            headers: {
                authorization: `token ` + process.env.GITHUB_TOKEN,
            },
        }
    )
}

main()
