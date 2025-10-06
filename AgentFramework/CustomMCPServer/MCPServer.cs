using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.Mcp;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace MCPServer.StorageMCP;

public class MCPServer
{
    private readonly ILogger<MCPServer> _logger;

    public MCPServer(ILogger<MCPServer> logger)
    {
        _logger = logger;
    }


    [Function("ExecuteMCP")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.OK);
        await res.WriteStringAsync("Welcome to Azure Functions!");
        return res;
    }

    [Function(nameof(SaveDataToBlobStorage))]
    public string SaveDataToBlobStorage([McpToolTrigger("SaveDataToBlob","This tool saves data to blob storage")] ToolInvocationContext context,
        [McpToolProperty("data", "string", "Data to be saved in blob in base64 format", Required = true)] string data,
        [McpToolProperty("containername", "string", "this is the blob container where the data is stored", Required = true)] string containerName,
        [McpToolProperty("blobname", "string", "this is the name of the blob file", Required = false)] string blobname = $"defaultblobpath.txt")

        
    {
        // Logic to save data to Blob Storage would go here.
        return $"Data '{Guid.NewGuid()}.txt' has been saved to Blob Storage.";
    }

}