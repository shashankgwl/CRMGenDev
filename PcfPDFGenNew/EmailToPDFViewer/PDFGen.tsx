import * as React from "react";
import { useState, useEffect } from "react";
import { getTheme, Modal, IconButton, IIconProps, FontWeights, IButtonStyles, Stack } from "@fluentui/react";
import { IPDFGenProps } from "./Model/IPDFGenProps";

const EmailTemplateToPDF: React.FC<IPDFGenProps> = (props) => {
    const [modelState, setModelState] = useState<IPDFGenProps>({
        recordId: '',
        emailTemplates: [],
        isOpen: props.isOpen,
        onChange: props.onChange
    });

    const theme = getTheme();

    const modalStyles = {
        main: { width: "1200px", height: "600px", padding: 20 }
    };

    const iconButtonStyles: Partial<IButtonStyles> = {
        root: {
            color: theme.palette.neutralPrimary,
            marginLeft: 'auto',
            top: 10,
            right: 10,
            position: 'absolute',
            marginTop: 4,
            marginRight: 2,
        },
        rootHovered: {
            color: theme.palette.neutralDark,
        },
    };

    const hideModal = () => {
        setModelState({ ...modelState, isOpen: false });
        modelState.onChange('');
    };

    const cancelIcon: IIconProps = { iconName: 'Cancel' };

    useEffect(() => {
        setModelState({ ...modelState, isOpen: props.isOpen });
    }, [props.isOpen]);

    return (
        <Modal
            isOpen={modelState.isOpen}
            onDismiss={hideModal}
            isBlocking={true}
            styles={modalStyles}
        >
            <Stack horizontalAlign="space-between">
                <Stack horizontalAlign="end" verticalAlign="start">
                    <IconButton
                        styles={iconButtonStyles}
                        iconProps={cancelIcon}
                        ariaLabel="Close popup modal"
                        onClick={hideModal}
                    />
                </Stack>
                <Stack horizontalAlign="start">
                    <span style={{ fontWeight: FontWeights.semibold }}>Email Templates</span>
                </Stack>
                <Stack>
                    <div>
                        <p>This is the list of email templates.</p>
                    </div>
                </Stack>
            </Stack>
        </Modal>
    );
};

export { EmailTemplateToPDF };