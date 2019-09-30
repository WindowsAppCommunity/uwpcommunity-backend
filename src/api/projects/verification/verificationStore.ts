export interface IVerificationStore {
    code: number;
    storeId: string;
}

export let verificationStorage: IVerificationStore[] = [];