namespace Apim.MCP.Functions;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
public class MCPTrigger
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly DataverseService _dataverseService;
    private readonly ILogger<MCPTrigger> _logger;

    public MCPTrigger(DataverseService dataverseService, ILogger<MCPTrigger> logger)
    {
        _dataverseService = dataverseService;
        _logger = logger;
    }

    [Function("SearchContactByEmail")]
    public async Task<IActionResult> SearchContactByEmail(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = "contacts/search")] HttpRequest req)
    {
        var email = req.Query.TryGetValue("email", out var queryValue)
            ? queryValue.ToString()
            : (await ReadJsonBody<SearchContactRequest>(req))?.Email;

        if (string.IsNullOrWhiteSpace(email))
        {
            return new BadRequestObjectResult(new { error = "Provide an email query string value or JSON body property." });
        }

        _logger.LogInformation("Searching Dataverse contact by email.");
        var contact = await _dataverseService.SearchContactByEmail(email);

        return contact is null
            ? new NotFoundObjectResult(new { message = "No contact found for the supplied email address." })
            : new OkObjectResult(contact);
    }

    [Function("CreateContact")]
    public async Task<IActionResult> CreateContact(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "contacts")] HttpRequest req)
    {
        var request = await ReadJsonBody<CreateContactRequest>(req);
        if (request is null)
        {
            return new BadRequestObjectResult(new { error = "Provide a JSON body." });
        }

        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.PhoneNumber)))
        {
            return new BadRequestObjectResult(new
            {
                error = "Provide firstname, lastname, and at least one of email or phoneNumber."
            });
        }

        _logger.LogInformation("Creating Dataverse contact.");
        var contact = await _dataverseService.CreateContact(request);

        return new CreatedResult($"/api/contacts/{contact.ContactId}", contact);
    }

    [Function("CreateOpportunity")]
    public async Task<IActionResult> CreateOpportunity(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "opportunities")] HttpRequest req)
    {
        var request = await ReadJsonBody<CreateOpportunityRequest>(req);
        if (request is null)
        {
            return new BadRequestObjectResult(new { error = "Provide a JSON body." });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new BadRequestObjectResult(new { error = "Provide name." });
        }

        _logger.LogInformation("Creating Dataverse opportunity.");
        var opportunity = await _dataverseService.CreateOpportunity(request);

        return new CreatedResult($"/api/opportunities/{opportunity.OpportunityId}", opportunity);
    }

    private static async Task<T?> ReadJsonBody<T>(HttpRequest req)
    {
        if (req.ContentLength is null or 0)
        {
            return default;
        }

        return await JsonSerializer.DeserializeAsync<T>(req.Body, JsonOptions);
    }
}

public sealed record SearchContactRequest(string? Email);

public sealed record CreateContactRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? PhoneNumber);

public sealed record CreateOpportunityRequest(
    string? Name,
    Guid? ParentContactId,
    decimal? BudgetAmount,
    decimal? EstimatedValue,
    DateTime? EstimatedCloseDate,
    string? CustomerNeed);

public sealed record ContactResponse(
    Guid ContactId,
    string? FirstName,
    string? LastName,
    string? Email,
    string? PhoneNumber);

public sealed record OpportunityResponse(
    Guid OpportunityId,
    string? Name,
    Guid? ParentContactId,
    decimal? BudgetAmount,
    decimal? EstimatedValue,
    DateTime? EstimatedCloseDate,
    string? CustomerNeed);
