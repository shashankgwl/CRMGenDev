import * as React from "react";
import { useState, useEffect } from "react";
import html2pdf from 'html2pdf.js';
import { getTheme, Modal, IconButton, IIconProps, FontWeights, IButtonStyles, Stack, List, ITheme, mergeStyleSets, getFocusStyle } from "@fluentui/react";
import { IPDFGenProps } from "../Model/IPDFGenProps";

const EmailTemplateToPDF: React.FC<IPDFGenProps> = (props) => {
    const [modelState, setModelState] = useState<IPDFGenProps>({
        recordId: props.recordId,
        emailTemplates: [],
        isOpen: props.isOpen,
        onChange: props.onChange,
        pcfContext: props.pcfContext
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

    const fetchAttributes = async (attributes: string, entityName: string, fieldSlugs: ISlugDefinition[], relationObj: INameQueryPair, html: string): Promise<string> => {
        const query = `/api/data/v9.2/${entityName}(${modelState.recordId})?$select=${attributes}`;

        const finalQuery = query + relationObj.query;
        const response = await fetch(finalQuery, {
            headers: {
                'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        const slugValueMapping: { [key: string]: string } = {};

        fieldSlugs.forEach((slug) => {
            const slugText = `{${slug.entityOrRelationShipName}.${slug.fieldName}}`;

            // Check if formatted value exists, else fallback to normal value
            const formattedKey = `${slug.fieldName}@OData.Community.Display.V1.FormattedValue`;
            slugValueMapping[slugText] = data[formattedKey] ?? data[slug.fieldName] ?? '';
        });


        const nameOfRelation = relationObj.relationShipSlugs[0].entityOrRelationShipName;   // Get the name of the relationship
        const parser = new DOMParser();
        const doc = parser.parseFromString(html ?? '', 'text/html');
        let tbody = doc.querySelectorAll('table tbody')[0];
        let tdCounter = 0;
        data[nameOfRelation].forEach((item: { [x: string]: any; }) => {

            const tr = document.createElement('tr');
            relationObj.relationShipSlugs.forEach((slug: ISlugDefinition) => {
                const td = tbody.querySelectorAll('td')[tdCounter];
                tdCounter++;
                const newTD = td.cloneNode(true);
                const textContent = newTD.textContent ?? '';
                (newTD as HTMLElement).innerHTML = (newTD as HTMLElement).innerHTML.replace(textContent, item[slug.fieldName]);   // Replace the content of the td with the value of the field
                tr.appendChild(newTD);
                tbody.appendChild(tr);
            })
        });

        const table = doc.querySelector('table');
        if (table) {
            const existingTbody = table.querySelector('tbody');
            if (existingTbody) {
                table.replaceChild(tbody, existingTbody);
            } else {
                table.appendChild(tbody);
            }
        }
        const firstTr = tbody.querySelector('tr');
        if (firstTr) {
            tbody = tbody.removeChild(firstTr);
        }

        html = doc.documentElement.outerHTML;

        Object.keys(slugValueMapping).forEach((slug) => {
            const value = slugValueMapping[slug];
            html = html?.replace(new RegExp(slug, 'g'), value) ?? '';
        });


        return html ?? '';
    };

    const parseHtml = async (html: string | null): Promise<string> => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html ?? '', 'text/html');
        const table = doc.querySelector('table');
        if (!table) {
            throw new Error('No table found in the provided HTML.');
        }

        const entitySlugs: ISlugDefinition[] = [];
        const regexEntity = /(?<!\{)\{(\w+\.\w+)\}(?!\})/g;
        let matchEntity;
        while ((matchEntity = regexEntity.exec(html ?? '')) !== null) {
            const matched = matchEntity[1].split('.');
            entitySlugs.push({
                entityOrRelationShipName: matched[0],
                fieldName: matched[1]
            });
        }

        const relationshipSlugs: ISlugDefinition[] = [];
        const regex = /\{\{(\w+\.\w+)\}\}/g;
        let match;
        while ((match = regex.exec(html ?? '')) !== null) {
            const matched = match[1].split('.');
            relationshipSlugs.push({
                entityOrRelationShipName: matched[0],
                fieldName: matched[1]
            });
        }

        let commaSeparatedEntityFields = '';
        let commaSeparatedRelFields = '';

        entitySlugs.forEach((field) => {
            commaSeparatedEntityFields += field.fieldName + ',';
        });

        relationshipSlugs.forEach((relationship) => {
            commaSeparatedRelFields += relationship.fieldName + ',';
        });


        commaSeparatedEntityFields = commaSeparatedEntityFields.replace(/,$/, ''); // Remove trailing comma
        commaSeparatedRelFields = commaSeparatedRelFields.replace(/,$/, ''); // Remove trailing comma

        const relationShipName = relationshipSlugs[0].entityOrRelationShipName;
        const entityName = entitySlugs[0].entityOrRelationShipName;
        const expandQuery = commaSeparatedRelFields ? `&$expand=${relationShipName}($select=${commaSeparatedRelFields})` : '';  // If there are relationships, add the expand query
        const nameQueryPair: INameQueryPair = { query: expandQuery, name: relationShipName, relationShipSlugs: relationshipSlugs };
        const tempHtml = await fetchAttributes(commaSeparatedEntityFields, entityName, entitySlugs, nameQueryPair, html ?? ''); // Fetch the attributes and replace the slugs with the values
        return tempHtml;
    }

    const convertHtmlToPDF = async (html: string | null): Promise<void> => {
        try {

            const htmlParsed = await parseHtml(html);

            const pdf = await html2pdf()
                .from(htmlParsed)
                .set({
                    margin: 1,
                    filename: 'document.pdf',
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                })
                .toPdf()
                .get('pdf');
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url);
        } catch (error) {
            console.error("Failed to convert HTML to PDF:", error);
            throw error;
        }
    }
    useEffect(() => {
        if (props.isOpen) {
            setModelState({ ...modelState, isOpen: props.isOpen });
            getEmailTemplates()
                .then((templates) => {
                    setModelState((prevState) => ({ ...prevState, emailTemplates: templates }));
                    return templates;
                })
                .catch((error) => {
                    console.error("Failed to fetch email templates:", error);
                    throw error;
                });
        } else {
            setModelState({ ...modelState, isOpen: props.isOpen });
        }
    }, [props.isOpen]);


    const onRenderCell = React.useCallback(
        (item?: IEmailTemplate, _index?: number | undefined): React.ReactNode => {
            if (!item) {
                return null;
            }
            return (
                <div className={classNames.itemCell} data-is-focusable={true}>
                    <div className={classNames.itemContent}>
                        <div className={classNames.itemName}>{item.title}</div>
                        <div>{item.description}</div>
                    </div>
                    <IconButton
                        iconProps={{ iconName: "Download" }}
                        title="Download"
                        ariaLabel="Download"
                        onClick={async () => await convertHtmlToPDF(item.safehtml)}
                        styles={{ root: { marginLeft: 'auto' } }}
                    />
                </div>
            );
        },
        [classNames],
    );

    const getEmailTemplates = async (): Promise<IEmailTemplate[]> => {
        return fetch('/api/data/v9.2/templates?$select=safehtml,title,description')
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
                return setModelState({ ...modelState, emailTemplates: templates, isOpen: props.isOpen });
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