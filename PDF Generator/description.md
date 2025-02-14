0 notifications total

Skip to search

Skip to main content

Keyboard shortcuts
Close jump menu
Search
new feed updates notifications
Home
My Network
Jobs
Messaging
Notifications
Shashank Bhide
Me

For Business
Reactivate Premium: 50% Off


Shashank Bhide
Individual article
Style










Manage

Update


Article cover image
Image courtesy Internet
Title
Generate PDF documents from Dataverse email templates no extra license required.
The requirements in my mind for PDF generation were absolutely clear and as listed below.

No additional licenses (third party or PP) should be required.

No complex integration should be needed, e.g. create a complicated function app, then create an unnecessary connector and do a 3 layer data exchange and lot of datatype conversion at each layer.

Based on the above requirements, it became clearer that I needed an in-house server side worker (plugin or workflow or power automate) and then invoke it from the model driven app.

To my surprise, the C# ecosystem lacks robust solutions (open source) for generating PDFs directly from HTML. The most popular library relies on external executables or DLLs for the conversion. And as we all know that in a Dataverse environment, executing such external files is almost certainly blocked by the framework, posing a significant challenge.

That's when I stumbled upon the html2Pdf.js client side library and decided to give it a try. The output PDF quality was better than my expectations. A little more tinkering with the PDF properties will definitely produce amazing PDF with more control

In my previous article, we saw a PCF control for a modal popup which could be launched from a command bar.

In this article we'll use the modal surface to show the email templates in a fluent UI List and a download button to download the PDF. 

You can see the video here.

How to configure
Create an email template.



Minimize image
Edit image
Delete image


Set repeater table header as shown below. Select the table and right click on it, and select table properties. (THIS SETP IS A MUST).



Minimize image
Edit image
Delete image




Minimize image
Edit image
Delete image


Download the code or solution from the repository.

Import the solution. Publish customizations.

Create an attribute and bind it to the PCF control.

Create a command bar button and set the bound attribute's value to "1" as shown in the previous article.



Click the command bar to open the list of email templates.

Minimize image
Edit image
Delete image


Click on download icon to convert the HTML to PDF.



Minimize image
Edit image
Delete image




Current limitations
Only one repeater table is supported.

Lookups not supported yet.

Repeater table must have a header set through table settings.





Draft - saved
