import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { EmailTemplateToPDF } from "./TSX/PDFGen";
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
        return value === "1";
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const formContext: any = context;
        const currentValue = context.parameters.sampleProperty.raw;

        const props: IPDFGenProps = {
            recordId: formContext.page.entityId || '',
            emailTemplates: [{
                templateId: '1', safehtml: '<h1>Test</h1>', title: 'Test',
                description: null
            }], // Dummy data
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
