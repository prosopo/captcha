import { ProsopoCaptcha } from "@prosopo/procaptcha";
export declare function CaptchaWidget({ challenge, solution, solutionClickEvent }: {
    challenge: ProsopoCaptcha;
    solution: number[];
    solutionClickEvent: (index: number) => void;
}): JSX.Element;
export default CaptchaWidget;
