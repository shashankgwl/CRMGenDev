namespace PDF_Generator
{
    using System;
    using Microsoft.Xrm.Sdk;
    //using OpenHtmlToPdf;

    /// <summary>
    /// Plugin development guide: https://docs.microsoft.com/powerapps/developer/common-data-service/plug-ins
    /// Best practices and guidance: https://docs.microsoft.com/powerapps/developer/common-data-service/best-practices/business-logic/
    /// </summary>
    public class Plugin1 : PluginBase
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Plugin1"/> class.
        /// </summary>
        /// <param name="unsecureConfiguration">Unsecure configuration.</param>
        /// <param name="secureConfiguration">Secure configuration.</param>
        public Plugin1(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(Plugin1))
        {
            // TODO: Implement your custom configuration handling
            // https://docs.microsoft.com/powerapps/developer/common-data-service/register-plug-in#set-configuration-data
        }

        /// <summary>
        /// Entry point for custom business logic execution.
        /// </summary>
        /// <param name="localPluginContext">The local plugin context.</param>
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
                    string emailtemplateID = (string)context.InputParameters["pdfgen_emailtemplateID"];
                    string recordId = (string)context.InputParameters["pdfgen_recid"];
                    tracingService.Trace($"emailtemplateID is {emailtemplateID}");
                    tracingService.Trace($"recordId is {recordId}");
                    context.OutputParameters["pdfgen_PDFResponse"] = "all is well";
                }
                catch (Exception ex)
                {
                    tracingService.Trace("ERROR : {0}", ex.ToString());
                    throw new InvalidPluginExecutionException("An error occurred in Sample_CustomAPIExample.", ex);
                }
            }
        }
    }
}