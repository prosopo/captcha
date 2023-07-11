import { Args } from './args'

export default async (args: Args) => {
    const outputFile: string = args.output
    const labelledMapFile: string | undefined = args.labelled
    const unlabelledMapFile: string | undefined = args.unlabelled
    const labelsFile: string | undefined = args.labels
    const seed: number = args.seed || 0
    const size: number = args.size || 9
    const minCorrect: number = Math.max(args.minCorrect || 0, 1) // at least 1 correct image
    const minIncorrect: number = Math.max(args.minIncorrect || 1, 1) // at least 1 incorrect image
    const minLabelled: number = minCorrect + minIncorrect // min incorrect + correct
    const maxLabelled: number = Math.min(args.maxLabelled || size, size) // at least 1 labelled image
    const saltRounds = 10
    const count = args.count || 1

    // the captcha contains n images. Each of these images are either labelled, being correct or incorrect against the target, or unlabelled. To construct one of these captchas, we need to decide how many of the images should be labelled vs unlabelled, and then how many of the labelled images should be correct vs incorrect
    // in the traditional captcha, two rounds are produced, one with labelled images and the other with unlabelled images. This gives 18 images overall, 9 labels produced.
    // the parameters for generation can regulate how many labels are collected vs how much of a test the captcha posses. E.g. 18 images could have 16 unlabelled and 2 labelled, or 2 unlabelled and 16 labelled. The former is a better test of the user being human, but the latter is a better for maximising label collection.
    // if we focus on a single captcha round of 9 images, we must have at least 1 labelled correct image in the captcha for it to work, otherwise it's just a labelling phase, which normally isn't a problem but if we're treating these as tests for humanity too then we need some kind of test in there. (e.g. we abolish the labelled then unlabelled pattern of the challenge rounds in favour of mixing labelled and unlabelled data, but we then run a small chance of serving two completely unlabelled rounds if we don't set the min number of labelled images to 1 per captcha round)

    // load the labels from file
    // these are the labels that unlabelled data will be assigned to
    // note that these can be differen to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
    // const labels = JSON.parse(fs.readFileSync(labelsFile, "utf8"))

    // // load the map to get the labelled and unlabelled data
    // const labelled: LabelledItem[] = JSON.parse(fs.readFileSync(labelledMapFile, "utf8"))
    // const unlabelled: UnlabelledItem[] = JSON.parse(fs.readFileSync(unlabelledMapFile, "utf8"))

    // // check for duplicates
    // const all = new Set<string>()
    // for(const entry of labelled) {
    //     if(all.has(entry.data)) {
    //         throw new Error(`Duplicate data entry: ${entry}`)
    //     }
    //     all.add(entry.data)
    // }
    // for(const entry of unlabelled) {
    //     if(all.has(entry.data)) {
    //         throw new Error(`Duplicate data entry: ${entry}`)
    //     }
    //     all.add(entry.data)
    // }
    // all.clear()

    // // split the labelled data by label
    // const labelToImages: { [label: string]: string[] } = {}
    // for (const entry of labelled) {
    //     labelToImages[entry.label] = labelToImages[entry.label] || []
    //     labelToImages[entry.label].push(entry.data)
    // }
    // const targets = Object.keys(labelToImages)

    // // generate n captchas
    // const captchas: Captcha[] = []
    // for (let i = 0; i < count; i++) {
    //     // uniformly sample targets
    //     const target = targets[i % targets.length]
    //     const notTargets = targets.filter((t) => t !== target)
    //     // how many labelled images should be in the captcha?
    //     const nLabelled = random.randRange(minLabelled, maxLabelled)
    //     // how many correct labelled images should be in the captcha?
    //     const nCorrect = random.randRange(minCorrect, nLabelled - minIncorrect)
    //     const nIncorrect = nLabelled - nCorrect

    //     // get the correct items
    //     const correctItems = new Set<string>()
    //     while (correctItems.size < nCorrect) {
    //         // get a random image from the target
    //         const image = random.choice(labelToImages[target])
    //         correctItems.add(image)
    //     }

    //     // get the incorrect items
    //     const incorrectItems = new Set<string>()
    //     while (incorrectItems.size < nIncorrect) {
    //         // get a random image from the target
    //         const notTarget = random.choice(notTargets)
    //         const image = random.choice(labelToImages[notTarget])
    //         incorrectItems.add(image)
    //     }

    //     // get the unlabelled items
    //     const unlabelledItems = new Set<string>()
    //     while (unlabelledItems.size < size - nLabelled) {
    //         // get a random image from the unlabelled data
    //         const image = random.choice(unlabelled)
    //         unlabelledItems.add(image)
    //     }

    //     const items: CaptchaItem[] = []
    //     // add the correct items
    //     for (const item of correctItems) {
    //         items.push({
    //             type: "image",
    //             data: item,
    //         })
    //     }
    //     // add the incorrect items
    //     for (const item of incorrectItems) {
    //         items.push({
    //             type: "image",
    //             data: item,
    //         })
    //     }
    //     // add the unlabelled items
    //     for (const item of unlabelledItems) {
    //         items.push({
    //             type: "image",
    //             data: item.data,
    //         })
    //     }
    //     // shuffle the items
    //     random.shuffle(items)

    //     // get the solutions
    //     const correct = [...Array(items.length).keys()].filter((i) => correctItems.has(items[i].data)).map((i) => i.toString())

    //     const salt = bcrypt.genSaltSync(saltRounds);
    //     // create the captcha
    //     const captcha: Captcha = {
    //         salt,
    //         target,
    //         items,
    //         correct,
    //         unlabelled,
    //     }
    //     captchas.push(captcha)
    // }

    // // write to file
    // const output: Captchas = {
    //     captchas,
    //     format: "SelectAll",
    // }
    // fs.writeFileSync(outputFile, JSON.stringify(output))
}
