function openRecordVersions(recId) {
    if (!recId) {
        showXrmMessage("Record ID is not available.");
        return;
    }

    recId = recId.replace("{", "").replace("}", "");

    var pageInput = {
        pageType: "custom",
        name: "new_recordversions_c6a51", // Replace with your custom page name
        entityName: "account", // Replace with your entity name
        recordId: recId
    };

    var navigationOptions = {
        target: 2, // Opens the page in a dialog
        width: { value: 80, unit: "%" },
        height: { value: 70, unit: "%" }
    };

    Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
        function success() {
            console.log("Custom page opened successfully");
        },
        function error(err) {
            console.error("Error opening custom page: ", err);
        }
    );
}

function showPCF(executionContext) {
    executionContext.getAttribute("new_emailtemplate").setValue("1");
}

function showXrmMessage(message) {
    var alertStrings = { text: message, title: "Message" };
    var alertOptions = { height: 200, width: 400 };

    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
        function (success) {
            console.log("Alert dialog closed");
        },
        function (error) {
            console.log("Error opening alert dialog: " + error.message);
        }
    );
}