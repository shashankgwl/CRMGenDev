using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml.Office2013.Word;

namespace Templates.PopulateTemplate;

public class PopulateWordTemplate
{
    private readonly ILogger<PopulateWordTemplate> _logger;

    public PopulateWordTemplate(ILogger<PopulateWordTemplate> logger)
    {
        _logger = logger;
    }

    [Function("PopulateWordTemplate")]
    public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequest req)
    {
        // We will get the word template as binary data and then use OpenXML to manipulate it.
        if (!req.HasFormContentType)
        {
            return new BadRequestObjectResult("Request must be multipart/form-data.");
        }

        try
        {
            var form = await req.ReadFormAsync();
            var file = form.Files["template"];
            // Get the JSON data for replacements
            if (!form.TryGetValue("data", out var dataString))
            {
                return new BadRequestObjectResult("No 'data' field found in the request.");
            }

            if (string.IsNullOrEmpty(dataString))
            {
                return new BadRequestObjectResult("Data field is empty or null.");
            }

            var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(dataString);
            if (data == null || !data.Any())
            {
                return new BadRequestObjectResult("Invalid or empty data provided.");
            }

            var finalStream = ReplaceContentControls(file, data);
            finalStream.Position = 0;
            File.WriteAllBytes("C:\\Users\\ShashankBhide\\temp1.docx", finalStream.ToArray());
            // Return the modified document as a file
            return new FileStreamResult(finalStream, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            {
                FileDownloadName = "processed-document.docx"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing Word template: {ex.Message}");
            return new StatusCodeResult(500);
        }
    }
private MemoryStream ReplaceContentControls(IFormFile file, Dictionary<string, object> data)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("File is null or empty.");
        }

        var tempStream = new MemoryStream();
        file.CopyTo(tempStream);
        tempStream.Position = 0;

        using (var wordDoc = WordprocessingDocument.Open(tempStream, true))
        {
            var body = wordDoc.MainDocumentPart?.Document.Body;
            if (body == null)
            {
                throw new InvalidOperationException("Document body is null.");
            }

            // Handle simple text replacements for non-repeater controls
            foreach (var item in data.Where(x => x.Value is string))
            {
                var contentControls = body.Descendants<SdtElement>()
                    .Where(sdt => sdt.SdtProperties?.GetFirstChild<Tag>()?.Val == item.Key)
                    .ToList();

                if (!contentControls.Any())
                {
                    _logger.LogWarning($"No content control found with tag '{item.Key}'.");
                    continue;
                }

                foreach (var contentControl in contentControls)
                {
                    var textElement = contentControl.Descendants<Text>().FirstOrDefault();
                    if (textElement != null)
                    {
                        textElement.Text = item.Value.ToString();
                    }
                    else
                    {
                        _logger.LogWarning($"No text element found in content control with tag '{item.Key}'.");
                    }
                }
            }

            // Handle repeater controls for all arrays in the JSON data
            foreach (var item in data.Where(x => x.Value is Newtonsoft.Json.Linq.JArray))
            {
                var repeaterArray = (Newtonsoft.Json.Linq.JArray)item.Value;
                var repeaterTag = item.Key;

                // Find the repeater content control by tag
                var repeaterControl = body.Descendants<SdtElement>()
                    .FirstOrDefault(sdt => sdt.SdtProperties?.GetFirstChild<Tag>()?.Val == repeaterTag);

                if (repeaterControl == null)
                {
                    _logger.LogWarning($"No repeater control found with tag '{repeaterTag}'.");
                    continue;
                }

                // Find the nested repeating section item
                var repeatingSectionItem = repeaterControl.Descendants<SdtElement>()
                    .FirstOrDefault(sdt => sdt.SdtProperties?.GetFirstChild<SdtRepeatedSectionItem>() != null);

                if (repeatingSectionItem == null)
                {
                    _logger.LogWarning($"No repeating section item found for repeater control '{repeaterTag}'.");
                    continue;
                }

                // Get the table row within the repeating section item
                var parentRow = repeatingSectionItem.Descendants<TableRow>().FirstOrDefault();
                if (parentRow == null)
                {
                    _logger.LogWarning($"No table row found within repeating section item for '{repeaterTag}'.");
                    continue;
                }

                // Get the parent table
                var parentTable = parentRow.Ancestors<Table>().FirstOrDefault();
                if (parentTable == null)
                {
                    _logger.LogWarning($"Parent table not found for repeater control '{repeaterTag}'.");
                    continue;
                }

                // Clone the row for each item in the repeater data
                foreach (var arrayItem in repeaterArray)
                {
                    var rowData = arrayItem.ToObject<Dictionary<string, string>>();
                    if (rowData == null)
                    {
                        _logger.LogWarning($"Invalid row data for repeater '{repeaterTag}'.");
                        continue;
                    }

                    // Clone the original row
                    var newRow = (TableRow)parentRow.CloneNode(true);

                    // Replace content controls within the cloned row
                    foreach (var replacement in rowData)
                    {
                        var contentControls = newRow.Descendants<SdtElement>()
                            .Where(sdt => sdt.SdtProperties?.GetFirstChild<Tag>()?.Val == replacement.Key)
                            .ToList();

                        if (!contentControls.Any())
                        {
                            _logger.LogWarning($"No content control found with tag '{replacement.Key}' in repeater row for '{repeaterTag}'.");
                            continue;
                        }

                        foreach (var contentControl in contentControls)
                        {
                            var textElement = contentControl.Descendants<Text>().FirstOrDefault();
                            if (textElement != null)
                            {
                                textElement.Text = replacement.Value;
                            }
                            else
                            {
                                _logger.LogWarning($"No text element found in content control with tag '{replacement.Key}' in repeater row for '{repeaterTag}'.");
                            }
                        }
                    }

                    // Insert the new row after the original row
                    var parentRowWrapper = parentTable.Elements().FirstOrDefault(e => e.Descendants<TableRow>().Contains(parentRow));
                    if (parentRowWrapper == null)
                    {
                        _logger.LogWarning($"Couldn't find the wrapper element in parentTable for the original row in repeater '{repeaterTag}'.");
                        continue;
                    }

                    parentTable.InsertAfter(newRow, parentRowWrapper);
                }

                // Remove the original repeater row
                parentRow.Remove();
            }

            wordDoc.MainDocumentPart?.Document.Save();
        }

        // Copy to output stream
        tempStream.Position = 0;
        var outputStream = new MemoryStream();
        tempStream.CopyTo(outputStream);
        outputStream.Position = 0;

        return outputStream;
    }


}