// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { graphql } from '@octokit/graphql'

const main = async () => {
    if (process.env.GITHUB_TOKEN === undefined) {
        throw new Error('GITHUB_TOKEN env variable not set')
    }
    if (process.env.PR_NUMBER === undefined) {
        throw new Error('PR_NUMBER env variable not set')
    }
    if (process.env.REPO === undefined) {
        throw new Error('REPO env variable not set')
    }

    // TODO get the type from graphql definition
    const pr: any = await graphql(
        `  
    query {
      repository(owner: "prosopo", name: ${process.env.REPO}) {
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
