export enum ScheduledTaskNames {
    BatchCommitment = 'BatchCommitment',
    CalculateSolution = 'CalculateSolution',
}

export enum ScheduledTaskStatus {
    Pending = 'Pending',
    Running = 'Running',
    Completed = 'Completed',
    Failed = 'Failed',
}

export interface ScheduledTaskResult {
    error?: string
    data?: Record<string, any>
}
