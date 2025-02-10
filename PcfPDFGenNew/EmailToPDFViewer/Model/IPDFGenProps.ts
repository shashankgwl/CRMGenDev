export interface IPDFGenProps {
    recordId: string;
    emailTemplates: string[];
    isOpen: boolean;
    onChange: (value: string) => void;
}