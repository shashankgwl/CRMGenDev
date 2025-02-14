Detailed Technical Design Document for PDFGen.tsx
Overview
The PDFGen.tsx file is a React functional component that generates a PDF from email templates. This component uses various libraries and Fluent UI components to interact with and display data, manage modal state, and convert HTML content to PDF.

Components and Libraries
React: Utilized for building the user interface.
html2pdf.js: Library for converting HTML content to PDF.
Fluent UI: Used for styling and UI components such as Modal, IconButton, Stack, and List.
Props
The component EmailTemplateToPDF accepts the following props:

recordId: The identifier for the record.
emailTemplates: Array of email templates.
isOpen: Boolean indicating if the modal is open.
onChange: Function to handle changes.
pcfContext: Context passed from the PCF control.
State
The component manages its internal state using the useState hook:

modelState: An object containing:
recordId
emailTemplates
isOpen
onChange
pcfContext
Styles
The component leverages Fluent UI's theming capabilities to style its elements:

modalStyles: Custom styles for the modal.
generateStyles: A function that generates styles based on the current theme.
iconButtonStyles: Custom styles for the icon button.
Functions
hideModal
This function closes the modal and triggers the onChange prop with an empty string.

JavaScript
const hideModal = () => {
    setModelState({ ...modelState, isOpen: false });
    modelState.onChange('');
};
fetchAttributes
This asynchronous function fetches data attributes from an API and processes them to replace placeholders in the provided HTML content.

JavaScript
const fetchAttributes = async (attributes, entityName, fieldSlugs, relationObj, html) => {
    // function logic
};
parseHTML
This function parses the provided HTML content, identifies placeholders, and fetches the corresponding data to replace these placeholders.

JavaScript
const parseHTML = async (html) => {
    // function logic
};
convertHtmlToPDF
This function converts the provided HTML content to a PDF using the html2pdf.js library.

JavaScript
const convertHtmlToPDF = async (html) => {
    // function logic
};
getEmailTemplates
This function fetches email templates from an API.

JavaScript
const getEmailTemplates = async () => {
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
onRenderCell
This function renders a cell for each email template in the list.

JavaScript
const onRenderCell = React.useCallback(
    (item, _index) => {
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
useEffect Hook
The useEffect hook is used to fetch email templates when the modal is opened and update the component state.

JavaScript
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
JSX Structure
The component renders a Fluent UI Modal containing a list of email templates. Each template can be converted to a PDF by clicking the download button.

JavaScript
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
Conclusion
The PDFGen.tsx component is a well-structured React component that leverages various libraries and Fluent UI components to provide a seamless user experience for converting email templates into PDFs. The component handles data fetching, state management, and PDF generation efficiently, ensuring a smooth and responsive interface.
