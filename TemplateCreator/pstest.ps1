$Uri = "http://localhost:7071/api/PopulateWordTemplate"
$filePath = ".\template.docx"
$data = @{
    name              = "John Doe"
    accountnumber     = "123456789"
    primarycontactid  = "contact123"
    address1_addresstypecode = "Home"
    mycontacts        = @(
        @{
            aryfname = "John"
            arylname = "Smith"
            aryemail = "john.smith@example.com"
            aryphone = "123-456-7890"
        },
        @{
            aryfname = "Jane"
            arylname = "Doe"
            aryemail = "jane.doe@example.com"
            aryphone = "987-654-3210"
        }
    )
} | ConvertTo-Json -Depth 10
$form = @{
    template = Get-Item $filePath
    data     = $data
}
$response = Invoke-RestMethod -Uri $Uri -Method Post -Form $form
Write-Host "Template filled and saved as tmplFilled.docx"