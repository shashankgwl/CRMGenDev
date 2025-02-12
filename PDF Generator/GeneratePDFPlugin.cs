using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Xsl;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;
using Microsoft.Xrm.Sdk.Query;
using org.docx4j.openpackaging.packages;
using org.docx4j.convert.out.pdf;


namespace PDF_Generator
{
    public class GeneratePDFPlugin : PluginBase
    {
        public GeneratePDFPlugin(string unsecureConfig, string secureConfig)
            : base(typeof(GeneratePDFPlugin))
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
            {
                throw new ArgumentNullException(nameof(localPluginContext));
            }

            var context = localPluginContext.PluginExecutionContext;
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            var tracingService = localPluginContext.TracingService;
            tracingService.Trace(context.MessageName);

            var service = localPluginContext.OrgSvcFactory.CreateOrganizationService(context.UserId)
                ?? throw new InvalidPluginExecutionException("Failed to retrieve the organization service.");

            if (context.MessageName.Equals("pdfgen_GeneratePDF"))
            {
                tracingService.Trace($"Message name is {context.MessageName} and stage is {context.Stage}");
                try
                {
                    ProcessGeneratePDF(context, service, tracingService);
                }
                catch (Exception ex)
                {
                    tracingService.Trace("ERROR : {0}", ex.ToString());
                    throw new InvalidPluginExecutionException("An error occurred in Sample_CustomAPIExample.", ex);
                }
            }
        }

        private void ProcessGeneratePDF(IPluginExecutionContext context, IOrganizationService service, ITracingService tracingService)
        {
            Guid emailtemplateID = Guid.Parse(context.InputParameters["pdfgen_emailtemplateID"].ToString());
            Guid recordId = Guid.Parse(context.InputParameters["pdfgen_recid"].ToString());
            string entityName = context.InputParameters["pdfgen_etn"].ToString();
            string relationShipName = string.Empty;

            tracingService.Trace($"emailtemplateID is {emailtemplateID} and recordid is {recordId} and entityName is {entityName}");

            var emailTemplate = service.Retrieve("template", Guid.Parse("f3c24ebe-3fde-ef11-8ee9-7c1e52023d91"), new ColumnSet("body"));
            emailTemplate.Attributes.TryGetValue("body", out var templateBody);
            tracingService.Trace($"templateBody is {templateBody}");

            var htmlContent = ConvertXsltToHtml(templateBody.ToString());
            tracingService.Trace($"htmlContent is {htmlContent}");

            var xmlToAttributeModel = ExtractEntityNamesAndAttributes(htmlContent, tracingService);
            tracingService.Trace("CLOSING FOR now");
            var entityMetadataResponse = (RetrieveEntityResponse)service.Execute(new RetrieveEntityRequest
            {
                EntityFilters = EntityFilters.Relationships,
                LogicalName = "account",
                RetrieveAsIfPublished = true
            });

            var entityMetadata = entityMetadataResponse.EntityMetadata;

            var oneToManyRelationships = entityMetadata.OneToManyRelationships;
            tracingService.Trace($"oneToManyRelationships count is {oneToManyRelationships.Count()}");

            foreach (var relationship in oneToManyRelationships)
            {
                if (xmlToAttributeModel.Any(x => x.EntityOrRelationshipName == relationship.SchemaName))
                {
                    relationShipName = relationship.SchemaName;
                    tracingService.Trace($"MIL GAYA matching relationship: {relationShipName}");
                    break;
                }
            }

            tracingService.Trace($"for loop completed");

            List<string> entityAttributes = new List<string>();
            List<string> relationShipAttributes = new List<string>();

            foreach (var item in xmlToAttributeModel)
            {
                if (item.EntityOrRelationshipName == entityName)
                {
                    entityAttributes.Add(item.AttributeName);
                }
                else if (item.EntityOrRelationshipName == relationShipName)
                {
                    relationShipAttributes.Add(item.AttributeName);
                }
            }

            tracingService.Trace($"Recordid is {recordId}");

            var recordData = service.Retrieve(entityName, recordId, new ColumnSet(entityAttributes.ToArray()));
            foreach (var attribute in entityAttributes)
            {
                recordData.Attributes.TryGetValue(attribute, out var value);
                htmlContent = htmlContent.Replace($"{{{entityName}.{attribute}}}", value.ToString());
            }

            var byteData = GetPdfData(htmlContent);
            tracingService.Trace($"byteData is {byteData.Length}");
















            //tracingService.Trace($"entityName is {entityName}");
            // var entityData= service.Retrieve(entityName, recordId, new ColumnSet(entityAttributes.ToArray()));
            // foreach (var attribute in entityAttributes)
            // {
            //     entityData.Attributes.TryGetValue(attribute, out var value);
            //     htmlContent = htmlContent.Replace($"{{{entityName}.{attribute}}}", value.ToString());
            // }

            tracingService.Trace($"emailtemplateID is {emailtemplateID}");
            tracingService.Trace($"recordId is {recordId}");
            context.OutputParameters["pdfgen_PDFResponse"] = "all is well";
        }

        private byte[] GetPdfData(string htmlContent)
        {
          
        }
    


            
        

        private List<XmlToAttributeModel> ExtractEntityNamesAndAttributes(string htmlContent, ITracingService tracingService)
        {
            //List<string> entityAttributes = new List<string>();
            //List<string> entityNames = new List<string>();
            List<XmlToAttributeModel> xmlToAttributeModels = new List<XmlToAttributeModel>();

            var matches = Regex.Matches(htmlContent, @"\{([^}]*)\}");
            foreach (Match match in matches)
            {
                var value = match.Groups[1].Value;
                if (string.IsNullOrEmpty(value))
                {
                    tracingService.Trace("Match value is null or empty");
                }
                else
                {
                    var parts = value.Split('.');
                    if (parts.Length == 2)
                    {
                        xmlToAttributeModels.Add(new XmlToAttributeModel
                        {
                            EntityOrRelationshipName = parts[0],
                            AttributeName = parts[1],
                            HtmlString = value
                        });

                        //entityNames.Add(parts[0]);
                        //entityAttributes.Add(parts[1]);
                        tracingService.Trace($"MIL GAYA value: {value}");
                    }
                    else
                    {
                        tracingService.Trace($"Invalid format for value: {value}");
                    }
                }
            }

            return xmlToAttributeModels;
        }

        private string ConvertXsltToHtml(string xsltContent)
        {
            var xslt = new XslCompiledTransform();
            using (var reader = XmlReader.Create(new StringReader(xsltContent)))
            {
                xslt.Load(reader);
            }

            using var stringWriter = new StringWriter();
            using var xmlWriter = XmlWriter.Create(stringWriter, xslt.OutputSettings);
            xslt.Transform(XmlReader.Create(new StringReader("<data></data>")), xmlWriter);
            return stringWriter.ToString();
        }
    }
}