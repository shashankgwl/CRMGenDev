export interface IPDFGenProps {
    recordId: string;
    emailTemplates: IEmailTemplate[];
    isOpen: boolean;
    onChange: (value: string) => void;
}