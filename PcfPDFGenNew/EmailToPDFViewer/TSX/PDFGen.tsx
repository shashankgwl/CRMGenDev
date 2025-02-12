import * as React from "react";
import { useState, useEffect } from "react";
import { getTheme, Modal, IconButton, IIconProps, FontWeights, IButtonStyles, Stack, List, Icon, getRTL, ITheme, mergeStyleSets, getFocusStyle } from "@fluentui/react";
import { IPDFGenProps } from "../Model/IPDFGenProps";

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

    const generateStyles = (theme: ITheme) => {
        const { palette, semanticColors, fonts } = theme;
        return mergeStyleSets({
            itemCell: [
                getFocusStyle(theme, { inset: -1 }),
                {
                    minHeight: 54,
                    padding: 10,
                    boxSizing: 'border-box',
                    borderBottom: `1px solid ${semanticColors.bodyDivider}`,
                    display: 'flex',
                    selectors: {
                        '&:hover': { background: palette.neutralLight },
                    },
                },
            ],
            itemImage: {
                flexShrink: 0,
            },
            itemContent: {
                marginLeft: 10,
                overflow: 'hidden',
                flexGrow: 1,
            },
            itemName: [
                fonts.xLarge,
                {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                },
            ],
            itemIndex: {
                fontSize: fonts.small.fontSize,
                color: palette.neutralTertiary,
                marginBottom: 10,
            },
            chevron: {
                alignSelf: 'center',
                marginLeft: 10,
                color: palette.neutralTertiary,
                fontSize: fonts.large.fontSize,
                flexShrink: 0,
            },
        });
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

    const classNames = React.useMemo(() => generateStyles(theme), [theme]);


    const hideModal = () => {
        setModelState({ ...modelState, isOpen: false });
        modelState.onChange('');
    };

    const onRenderCell = React.useCallback(
        (item?: IEmailTemplate, index?: number | undefined, isScrolling?: boolean): React.ReactNode => {
            if (!item) {
                return null;
            }
            return (
                <div className={classNames.itemCell} data-is-focusable={true}>

                    <div className={classNames.itemContent}>
                        <div className={classNames.itemName}>{item.title}</div>
                        <div className={classNames.itemIndex}>{`Item ${index}`}</div>
                        <div>{item.description}</div>
                    </div>
                    <Icon className={classNames.chevron} iconName={getRTL() ? 'ChevronLeft' : 'ChevronRight'} />
                </div>
            );
        },
        [classNames],
    );

    const getEmailTemplates = async (): Promise<IEmailTemplate[]> => {
        return fetch('/api/data/v9.2/templates?$select=safehtml,title,description&$filter=(templateid%20eq%20%27af776cb6-c1e7-ef11-9342-6045bd022000%27)')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = response.json();
                console.log(data);
                return data;
            })
            .then(data => data.value ?? []) // Ensure it returns an array
            .catch(error => {
                console.error("Failed to fetch email templates:", error);
                return [];
            });
    };

    const cancelIcon: IIconProps = { iconName: 'Cancel' };

    useEffect(() => {
        if (!props.isOpen) {
            setModelState({ ...modelState, isOpen: props.isOpen });
            return;
        }

        getEmailTemplates()
            .then((templates) => {
                return setModelState({ ...modelState, emailTemplates: templates, isOpen: props.isOpen }); // ✅ Now returns
            })
            .catch((error) => {
                console.error("Failed to fetch email templates:", error);
            });
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
                        <List
                            items={modelState.emailTemplates}
                            onRenderCell={onRenderCell}
                        />
                    </div>
                </Stack>
            </Stack>
        </Modal>
    );
};

export { EmailTemplateToPDF };