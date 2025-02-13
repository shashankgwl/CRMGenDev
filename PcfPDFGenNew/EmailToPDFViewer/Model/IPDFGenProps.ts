import { IInputs } from "../generated/ManifestTypes";

export interface IPDFGenProps {
    recordId: string;
    emailTemplates: IEmailTemplate[];
    isOpen: boolean;
    onChange: (value: string) => void;
    pcfContext : ComponentFramework.Context<IInputs>
}