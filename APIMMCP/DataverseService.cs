using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Configuration;

namespace Apim.MCP.Functions;

public sealed class DataverseService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient;
    private readonly TokenCredential _credential;
    private readonly string[] _scopes;

    public DataverseService(IConfiguration configuration)
    {
        var dataverseUrl = configuration["DataverseUrl"];
        if (string.IsNullOrWhiteSpace(dataverseUrl))
        {
            throw new InvalidOperationException("DataverseUrl configuration is required.");
        }

        var organizationUri = new Uri(dataverseUrl.TrimEnd('/'));
        _scopes = [$"{organizationUri}/.default"];

        var managedIdentityClientId = configuration["ManagedIdentityClientId"];
        _credential = string.IsNullOrWhiteSpace(managedIdentityClientId)
            ? new ManagedIdentityCredential()
            : new ManagedIdentityCredential(managedIdentityClientId);

        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(organizationUri, "/api/data/v9.2/")
        };
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _httpClient.DefaultRequestHeaders.Add("OData-MaxVersion", "4.0");
        _httpClient.DefaultRequestHeaders.Add("OData-Version", "4.0");
    }

    public async Task<ContactResponse?> SearchContactByEmail(string email)
    {
        var filter = Uri.EscapeDataString($"emailaddress1 eq '{EscapeODataString(email.Trim())}'");
        var requestUri = $"contacts?$select=contactid,firstname,lastname,emailaddress1,telephone1&$filter={filter}&$top=1";

        using var request = await CreateRequest(HttpMethod.Get, requestUri);
        using var response = await _httpClient.SendAsync(request);
        await EnsureSuccess(response);

        var result = await response.Content.ReadFromJsonAsync<DataverseListResponse<DataverseContact>>(JsonOptions);
        var contact = result?.Value.FirstOrDefault();

        return contact is null ? null : MapContact(contact);
    }

    public async Task<ContactResponse> CreateContact(CreateContactRequest request)
    {
        var payload = new DataverseContactCreate(
            request.FirstName!.Trim(),
            request.LastName!.Trim(),
            TrimOrNull(request.Email),
            TrimOrNull(request.PhoneNumber));

        using var httpRequest = await CreateRequest(
            HttpMethod.Post,
            "contacts?$select=contactid,firstname,lastname,emailaddress1,telephone1",
            payload);
        httpRequest.Headers.Add("Prefer", "return=representation");

        using var response = await _httpClient.SendAsync(httpRequest);
        await EnsureSuccess(response);

        var contact = await response.Content.ReadFromJsonAsync<DataverseContact>(JsonOptions)
            ?? throw new InvalidOperationException("Dataverse did not return the created contact.");

        return MapContact(contact);
    }

    public async Task<OpportunityResponse> CreateOpportunity(CreateOpportunityRequest request)
    {
        var payload = new DataverseOpportunityCreate(
            request.Name!.Trim(),
            request.ParentContactId is null ? null : $"/contacts({request.ParentContactId})",
            request.BudgetAmount,
            request.EstimatedValue,
            ToDataverseDate(request.EstimatedCloseDate),
            TrimOrNull(request.CustomerNeed));

        using var httpRequest = await CreateRequest(
            HttpMethod.Post,
            "opportunities?$select=opportunityid,name,_parentcontactid_value,budgetamount,estimatedvalue,estimatedclosedate,customerneed",
            payload);
        httpRequest.Headers.Add("Prefer", "return=representation");

        using var response = await _httpClient.SendAsync(httpRequest);
        await EnsureSuccess(response);

        var opportunity = await response.Content.ReadFromJsonAsync<DataverseOpportunity>(JsonOptions)
            ?? throw new InvalidOperationException("Dataverse did not return the created opportunity.");

        return new OpportunityResponse(
            opportunity.OpportunityId,
            opportunity.Name,
            opportunity.ParentContactId,
            opportunity.BudgetAmount,
            opportunity.EstimatedValue,
            opportunity.EstimatedCloseDate,
            opportunity.CustomerNeed);
    }

    private async Task<HttpRequestMessage> CreateRequest(HttpMethod method, string requestUri, object? body = null)
    {
        var token = await _credential.GetTokenAsync(new TokenRequestContext(_scopes), CancellationToken.None);
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

        if (body is not null)
        {
            var json = JsonSerializer.Serialize(body, JsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        return request;
    }

    private static async Task EnsureSuccess(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var body = await response.Content.ReadAsStringAsync();
        throw new InvalidOperationException($"Dataverse Web API request failed with {(int)response.StatusCode} {response.ReasonPhrase}. {body}");
    }

    private static ContactResponse MapContact(DataverseContact contact)
    {
        return new ContactResponse(
            contact.ContactId,
            contact.FirstName,
            contact.LastName,
            contact.Email,
            contact.PhoneNumber);
    }

    private static string EscapeODataString(string value) => value.Replace("'", "''");

    private static string? ToDataverseDate(DateTime? value) => value?.ToString("yyyy-MM-dd");

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record DataverseListResponse<T>(
        [property: JsonPropertyName("value")] IReadOnlyList<T> Value);

    private sealed record DataverseContact(
        [property: JsonPropertyName("contactid")] Guid ContactId,
        [property: JsonPropertyName("firstname")] string? FirstName,
        [property: JsonPropertyName("lastname")] string? LastName,
        [property: JsonPropertyName("emailaddress1")] string? Email,
        [property: JsonPropertyName("telephone1")] string? PhoneNumber);

    private sealed record DataverseContactCreate(
        [property: JsonPropertyName("firstname")] string FirstName,
        [property: JsonPropertyName("lastname")] string LastName,
        [property: JsonPropertyName("emailaddress1")] string? Email,
        [property: JsonPropertyName("telephone1")] string? PhoneNumber);

    private sealed record DataverseOpportunity(
        [property: JsonPropertyName("opportunityid")] Guid OpportunityId,
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("_parentcontactid_value")] Guid? ParentContactId,
        [property: JsonPropertyName("budgetamount")] decimal? BudgetAmount,
        [property: JsonPropertyName("estimatedvalue")] decimal? EstimatedValue,
        [property: JsonPropertyName("estimatedclosedate")] DateTime? EstimatedCloseDate,
        [property: JsonPropertyName("customerneed")] string? CustomerNeed);

    private sealed record DataverseOpportunityCreate(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("parentcontactid@odata.bind")] string? ParentContactBinding,
        [property: JsonPropertyName("budgetamount")] decimal? BudgetAmount,
        [property: JsonPropertyName("estimatedvalue")] decimal? EstimatedValue,
        [property: JsonPropertyName("estimatedclosedate")] string? EstimatedCloseDate,
        [property: JsonPropertyName("customerneed")] string? CustomerNeed);
}
