import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { EmailTemplateToPDF } from "./PDFGen";
import { IPDFGenProps } from "./Model/IPDFGenProps";
import * as React from "react";

export class EmailToPDFViewer implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private currentValue: string | undefined = '';

    constructor() {
        console.log('constructor called');
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        console.log('init called');
        this.notifyOutputChanged = notifyOutputChanged;
        this.currentValue = context.parameters.sampleProperty.raw ?? '';
    }

    private hasValidAttributeValue(value: string | null): boolean {
        return value !== '' && value !== null && value !== "0";
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const formContext: any = context;
        const currentValue = context.parameters.sampleProperty.raw;

        const props: IPDFGenProps = {
            recordId: formContext.page.entityId || '',
            emailTemplates: ["template1.xml", "template2.xml"],
            isOpen: this.hasValidAttributeValue(currentValue),
            onChange: (value: string) => {
                this.currentValue = value;
                this.notifyOutputChanged();
            }
        };

        return React.createElement(EmailTemplateToPDF, props);
    }

    public getOutputs(): IOutputs {
        return {
            sampleProperty: this.currentValue
        };
    }

    public destroy(): void {
        // Cleanup if necessary
    }
}
